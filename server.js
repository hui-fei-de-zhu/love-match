const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3457;

const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(__dirname));

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (_) {}
  return [];
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// 登记
app.post('/api/register', (req, res) => {
  const { yourName, crushName } = req.body;
  if (!yourName || !crushName) {
    return res.status(400).json({ ok: false, msg: '名字不能为空' });
  }
  const yn = yourName.trim();
  const cn = crushName.trim();
  if (yn === cn) {
    return res.status(400).json({ ok: false, msg: '不能和自己配对' });
  }

  const records = readData();

  // 查找双向匹配
  const matchIdx = records.findIndex(r => r.yourName === cn && r.crushName === yn);

  if (matchIdx >= 0) {
    // 配对成功！移除双方记录
    const matched = records[matchIdx];
    const newRecords = records.filter((_, i) => i !== matchIdx);
    // 也移除当前用户之前的记录
    const selfIdx = newRecords.findIndex(r => r.yourName === yn);
    if (selfIdx >= 0) newRecords.splice(selfIdx, 1);
    writeData(newRecords);
    return res.json({ ok: true, matched: true, yourName: yn, crushName: cn });
  }

  // 未匹配，更新或创建记录
  const existIdx = records.findIndex(r => r.yourName === yn);
  const record = { yourName: yn, crushName: cn, time: Date.now() };
  if (existIdx >= 0) {
    records[existIdx] = record;
  } else {
    records.push(record);
  }
  writeData(records);
  res.json({ ok: true, matched: false, yourName: yn, crushName: cn });
});

// 查询状态
app.get('/api/check', (req, res) => {
  const { name } = req.query;
  if (!name) {
    return res.status(400).json({ ok: false, msg: '名字不能为空' });
  }
  const nm = name.trim();
  const records = readData();

  // 谁喜欢我
  const whoLikesMe = records.filter(r => r.crushName === nm);
  // 我喜欢谁
  const myCrush = records.find(r => r.yourName === nm);

  // 检查互相配对
  let mutualMatch = null;
  if (myCrush) {
    const match = whoLikesMe.find(r => r.yourName === myCrush.crushName);
    if (match) {
      mutualMatch = { name1: nm, name2: myCrush.crushName };
    }
  }

  res.json({
    ok: true,
    name: nm,
    whoLikesMe: whoLikesMe.map(r => ({ yourName: r.yourName, time: r.time })),
    myCrush: myCrush ? { crushName: myCrush.crushName, time: myCrush.time } : null,
    mutualMatch
  });
});

// 获取所有记录(调试用)
app.get('/api/all', (req, res) => {
  res.json({ ok: true, records: readData() });
});

// 清除数据
app.delete('/api/reset', (req, res) => {
  writeData([]);
  res.json({ ok: true, msg: '数据已清除' });
});

app.listen(PORT, () => {
  console.log(`心动配对服务器已启动: http://localhost:${PORT}`);
});
