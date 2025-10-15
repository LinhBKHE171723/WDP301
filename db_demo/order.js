[
  {
    "_id": { "$oid": "653100000000000000000001" },
    "userId": { "$oid": "652fa123abc1234567890005" },
    "servedBy": { "$oid": "652fa123abc1234567890002" },
    "tableId": { "$oid": "653000000000000000000001" },
    "orderItems": [
      { "$oid": "653200000000000000000001" },
      { "$oid": "653200000000000000000002" }
    ],
    "paymentId": null,
    "status": "served",
    "totalAmount": 420000,
    "discount": 0,
    "servedAt": { "$date": "2025-10-13T10:30:00Z" },
    "createdAt": { "$date": "2025-10-13T10:00:00Z" },
    "updatedAt": { "$date": "2025-10-13T10:30:00Z" }
  },
  {
    "_id": { "$oid": "653100000000000000000002" },
    "userId": { "$oid": "652fa123abc1234567890006" },
    "servedBy": { "$oid": "652fa123abc1234567890002" },
    "tableId": { "$oid": "653000000000000000000003" },
    "orderItems": [
      { "$oid": "653200000000000000000003" }
    ],
    "paymentId": null,
    "status": "preparing",
    "totalAmount": 180000,
    "discount": 10000,
    "servedAt": null,
    "createdAt": { "$date": "2025-10-13T11:00:00Z" },
    "updatedAt": { "$date": "2025-10-13T11:10:00Z" }
  },
  {
    "_id": { "$oid": "653100000000000000000003" },
    "userId": { "$oid": "652fa123abc1234567890007" },
    "servedBy": { "$oid": "652fa123abc1234567890002" },
    "tableId": { "$oid": "653000000000000000000005" },
    "orderItems": [
      { "$oid": "653200000000000000000004" },
      { "$oid": "653200000000000000000005" }
    ],
    "paymentId": null,
    "status": "waiting_confirm",
    "totalAmount": 250000,
    "discount": 0,
    "servedAt": null,
    "createdAt": { "$date": "2025-10-13T11:15:00Z" },
    "updatedAt": { "$date": "2025-10-13T11:15:00Z" }
  }
]
