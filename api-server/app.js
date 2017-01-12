require('dotenv').config();
const cfenv = require('cfenv');
const appEnv = cfenv.getAppEnv();
const MongoClient = require('mongodb').MongoClient;
const url = appEnv.getServiceURL('mongodb-instance');
const assert = require('assert');
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({port: process.env.PORT});

MongoClient.connect(url, (err, db) => {
  assert.equal(null, err);
  const collection = db.collection('measurements');
  console.log('Connected to database');

  wss.on('connection', (ws) => {
    collection.find({}, {a: 1, createdAt: 1, _id: 0}).sort({'_id': -1}).limit(10).toArray((err, docs) => {
      assert.equal(err, null);
      docs.reverse().forEach((message) => {
        ws.send(JSON.stringify(message));
      });
    });

    ws.on('message', (message) => {
      let doc = JSON.parse(message);
      doc.createdAt = new Date;

      wss.clients.forEach((conn) => {
        conn.send(JSON.stringify(doc));
      });

      collection.insertOne(doc, (err, result) => {
        assert.equal(err, null);
        console.log('Inserted measurement: %j', doc);
      });
    });
  });
});
