const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3457;
const API_KEY = process.env.API_KEY || 'love-match-2024';
const MONGODB_URI = process.env.MONGODB_URI;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'records.json');

// ========== Middleware ==========
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ========== MongoDB Setup ==========
const recordSchema = new mongoose.Schema({
  recordId: { type: String, required: true, unique: true },
  myName: { type: String, required: true },
  crushName: { type: String, required: true },
  timestamp: { type: Number, required: true },
  matched: { type: Boolean, default: false },
  matchId: { type: String, default: null }
});

let Record = null;
let useMongo = false;

async function connectMongo() {
  if (!MONGODB_URI) return;
  try {
    await mongoose.connect(MONGODB_URI);
    Record = mongoose.model('Record', recordSchema);
    useMongo = true;
    console.log('  MongoDB 已连接');
  } catch (e) {
    console.log('  MongoDB 连接失败，使用文件存储');
    console.log('  ' + e.message);
  }
}

// ========== Data Adapter ==========
async function dbLoadAll() {
  if (useMongo) {
    const docs = await Record.find({});
    return docs.map(doc => ({
      id: doc.recordId,
      myName: doc.myName,
      crushName: doc.crushName,
      timestamp: doc.timestamp,
      matched: doc.matched,
      matchId: doc.matchId
    }));
  }
  return loadRecords();
}

async function dbSaveAll(records) {
  if (useMongo) {
    await Record.deleteMany({});
    if (records.length > 0) {
      const docs = records.map(r => ({
        recordId: r.id,
        myName: r.myName,
        crushName: r.crushName,
        timestamp: r.timestamp,
        matched: r.matched,
        matchId: r.matchId
      }));
      await Record.insertMany(docs);
    }
    return;
  }
  saveRecords(records);
}

// ========== Helpers ==========
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
  }
}

function loadRecords() {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveRecords(records) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
}

function normalize(str) {
  return str.trim().replace(/\s+/g, ' ');
}

function validateApiKey(req, res, next) {
  const key = req.query.apiKey || (req.body && req.body.apiKey);
  if (key !== API_KEY) {
    return res.status(403).json({ success: false, error: '无效的API密钥' });
  }
  next();
}

// ========== API Routes ==========

// Health check (no auth needed)
app.get('/api/health', (req, res) => {
  res.json({ success: true, time: Date.now() });
});

// Get tunnel URL
app.get('/api/tunnel-url', (req, res) => {
  const tunnelFile = path.join(__dirname, 'tunnel', 'tunnel_url.txt');
  try {
    if (fs.existsSync(tunnelFile)) {
      const url = fs.readFileSync(tunnelFile, 'utf-8').trim();
      if (url) {
        return res.json({ success: true, url });
      }
    }
    res.json({ success: false, url: null });
  } catch (e) {
    res.json({ success: false, url: null });
  }
});

// Register or update a crush
app.post('/api/register', validateApiKey, async (req, res) => {
  const { myName, crushName } = req.body;

  if (!myName || !crushName) {
    return res.status(400).json({ success: false, error: '名字不能为空' });
  }

  const nMy = normalize(myName);
  const nCrush = normalize(crushName);

  if (!nMy || !nCrush) {
    return res.status(400).json({ success: false, error: '名字不能为空' });
  }
  if (nMy.length > 20 || nCrush.length > 20) {
    return res.status(400).json({ success: false, error: '名字不能超过20个字符' });
  }
  if (nMy === nCrush) {
    return res.status(400).json({ success: false, error: '不能填写自己的名字' });
  }

  const records = await dbLoadAll();

  // Find if crush has registered and chosen me (unmatched)
  const crushRecord = records.find(r =>
    normalize(r.myName) === nCrush &&
    normalize(r.crushName) === nMy &&
    !r.matched
  );

  // Find my existing record
  const myExistingIdx = records.findIndex(r => normalize(r.myName) === nMy);

  // Clean up old match if I was previously matched
  if (myExistingIdx >= 0 && records[myExistingIdx].matched && records[myExistingIdx].matchId) {
    const oldMatchId = records[myExistingIdx].matchId;
    const oldMatchIdx = records.findIndex(r => r.id === oldMatchId);
    if (oldMatchIdx >= 0) {
      records[oldMatchIdx].matched = false;
      records[oldMatchIdx].matchId = null;
    }
  }

  const now = Date.now();
  let matched = false;
  let myRecord;

  if (crushRecord) {
    // MUTUAL MATCH!
    matched = true;
    myRecord = {
      id: 'rec_' + now + '_' + Math.random().toString(36).slice(2, 8),
      myName: nMy,
      crushName: nCrush,
      timestamp: now,
      matched: true,
      matchId: crushRecord.id
    };

    if (myExistingIdx >= 0) {
      records[myExistingIdx] = myRecord;
    } else {
      records.push(myRecord);
    }

    // Update crush's record
    const crushIdx = records.findIndex(r => r.id === crushRecord.id);
    if (crushIdx >= 0) {
      records[crushIdx].matched = true;
      records[crushIdx].matchId = myRecord.id;
    }
  } else {
    // No match yet
    myRecord = {
      id: 'rec_' + now + '_' + Math.random().toString(36).slice(2, 8),
      myName: nMy,
      crushName: nCrush,
      timestamp: now,
      matched: false,
      matchId: null
    };

    if (myExistingIdx >= 0) {
      records[myExistingIdx] = myRecord;
    } else {
      records.push(myRecord);
    }
  }

  await dbSaveAll(records);

  res.json({
    success: true,
    matched,
    myName: nMy,
    crushName: nCrush
  });
});

// Query match status
app.get('/api/query', validateApiKey, async (req, res) => {
  const { name1, name2 } = req.query;

  if (!name1 || !name2) {
    return res.status(400).json({ success: false, error: '请提供两个名字' });
  }

  const key1 = normalize(name1);
  const key2 = normalize(name2);

  if (key1 === key2) {
    return res.status(400).json({ success: false, error: '不能查询自己和自己' });
  }

  const records = await dbLoadAll();

  const r1 = records.find(r =>
    normalize(r.myName) === key1 && normalize(r.crushName) === key2
  );
  const r2 = records.find(r =>
    normalize(r.myName) === key2 && normalize(r.crushName) === key1
  );

  let status, detail;

  if (r1 && r2 && r1.matched && r2.matched) {
    status = 'matched';
    detail = '配对成功！互相喜欢 💕';
  } else if (r1 && r2) {
    status = 'both_registered';
    detail = '双方都已填写但未配对';
  } else if (r1 && !r2) {
    status = 'one_way_1to2';
    detail = name1 + ' 选择了 ' + name2 + '，但 ' + name2 + ' 还没有回应';
  } else if (!r1 && r2) {
    status = 'one_way_2to1';
    detail = name2 + ' 选择了 ' + name1 + '，但 ' + name1 + ' 还没有回应';
  } else {
    status = 'none';
    detail = '还没有找到相关的配对记录';
  }

  res.json({
    success: true,
    status,
    detail,
    name1: key1,
    name2: key2,
    hasRecord1: !!r1,
    hasRecord2: !!r2,
    matched1: r1 ? r1.matched : false,
    matched2: r2 ? r2.matched : false
  });
});

// Get stats
app.get('/api/stats', validateApiKey, async (req, res) => {
  const records = await dbLoadAll();
  const uniqueNames = new Set(records.map(r => normalize(r.myName)));
  const matchedPairs = Math.floor(records.filter(r => r.matched).length / 2);

  res.json({
    success: true,
    totalParticipants: uniqueNames.size,
    totalRecords: records.length,
    matchedPairs
  });
});

// Get all records (admin)
app.get('/api/admin/records', validateApiKey, async (req, res) => {
  const records = await dbLoadAll();
  res.json({ success: true, records, total: records.length });
});

// Clear all data (admin)
app.post('/api/admin/clear', validateApiKey, async (req, res) => {
  await dbSaveAll([]);
  res.json({ success: true, message: '所有数据已清除' });
});

// Delete a specific record (admin)
app.delete('/api/admin/record/:id', validateApiKey, async (req, res) => {
  const records = await dbLoadAll();
  const idx = records.findIndex(r => r.id === req.params.id);
  if (idx >= 0) {
    const record = records[idx];
    // Also un-match the paired record if matched
    if (record.matched && record.matchId) {
      const pairIdx = records.findIndex(r => r.id === record.matchId);
      if (pairIdx >= 0) {
        records[pairIdx].matched = false;
        records[pairIdx].matchId = null;
      }
    }
    records.splice(idx, 1);
    await dbSaveAll(records);
    res.json({ success: true, message: '记录已删除' });
  } else {
    res.status(404).json({ success: false, error: '记录不存在' });
  }
});

// ========== Start Server ==========
async function start() {
  await connectMongo();

  app.listen(PORT, () => {
    if (!useMongo) ensureDataDir();
    console.log('');
    console.log('  💕  心动配对服务器已启动');
    console.log('  ─────────────────────────');
    console.log('  地址: http://localhost:' + PORT);
    console.log('  密钥: ' + API_KEY);
    console.log('  存储: ' + (useMongo ? 'MongoDB 云数据库' : '本地文件'));
    console.log('');
  });
}

start();
