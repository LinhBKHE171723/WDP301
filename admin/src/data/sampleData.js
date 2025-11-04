// src/pages/kitchenmanager/data/sampleData.js
export const ordersData = [
  {
    id: 1,
    table: 5,
    time: "14:30",
    waitTime: 330,
    status: "pending",
    items: [
      { id: 1, name: "Phở Bò", chef: null, status: "pending" },
      { id: 2, name: "Bún Chả", chef: null, status: "pending" },
      { id: 3, name: "Chả Cá", chef: null, status: "pending" },
    ],
  },
  {
    id: 2,
    table: 3,
    time: "14:45",
    waitTime: 180,
    status: "cooking",
    items: [
      { id: 4, name: "Bánh Mì", chef: "Anh Tuấn", status: "cooking" },
      { id: 5, name: "Cà Phê Sữa", chef: "Chị Lan", status: "ready" },
    ],
  },
];

export const itemsData = [
  {
    id: 1,
    name: "Phở Bò",
    description: "Phở bò truyền thống với nước dùng đậm đà",
    price: 65000,
    available: true,
  },
  {
    id: 2,
    name: "Bún Chả",
    description: "Bún chả Hà Nội với thịt nướng thơm ngon",
    price: 55000,
    available: true,
  },
  {
    id: 3,
    name: "Chả Cá",
    description: "Chả cá Lã Vọng với bánh tráng và bún",
    price: 85000,
    available: false,
  },
];

export const menusData = [
  { id: 1, name: "Combo Sáng", items: [4, 5], totalPrice: 45000 },
  { id: 2, name: "Set Phở", items: [1, 5], totalPrice: 85000 },
];

export const chefsData = [
  { id: 1, name: "Anh Tuấn", specialty: "Món chính" },
  { id: 2, name: "Chị Lan", specialty: "Đồ uống" },
  { id: 3, name: "Anh Minh", specialty: "Cơm" },
  { id: 4, name: "Chị Hoa", specialty: "Tráng miệng" },
];
