// js/constants.js

window.CATEGORIES_RU = {
    ALL: 'Все',
    HOME: 'Дом',
    APPAREL: 'Одежда',
    ACCESSORIES: 'Аксессуары',
    STATIONERY: 'Канцелярия'
};
  
const CAT = window.CATEGORIES_RU;

// Полный список товаров с точными размерами из твоего файла
window.PRODUCTS_DATA = [
    {
      id: 'p1',
      name: 'Коврик',
      category: CAT.HOME,
      defaultPrefix: 'KVR',
      width: 3508,
      height: 2480,
      maskType: 'rect'
    },
    {
      id: 'p2',
      name: 'Круглый коврик',
      category: CAT.HOME,
      defaultPrefix: 'KVR-R',
      width: 3508,
      height: 2480,
      maskType: 'rect'
    },
    {
      id: 'p3',
      name: 'Кружка',
      category: CAT.ACCESSORIES,
      defaultPrefix: 'MUG',
      width: 2480,
      height: 1181,
      maskType: 'rect'
    },
    {
      id: 'p4',
      name: 'Подушка',
      category: CAT.HOME,
      defaultPrefix: 'PLW',
      width: 4606,
      height: 3307,
      maskType: 'rect'
    },
    {
      id: 'p5',
      name: 'Термокружка',
      category: CAT.ACCESSORIES,
      defaultPrefix: 'TRM',
      width: 3508,
      height: 2480,
      maskType: 'rect'
    },
    {
      id: 'p6',
      name: 'Сумка',
      category: CAT.ACCESSORIES,
      defaultPrefix: 'BAG',
      width: 4961,
      height: 3508,
      maskType: 'rect'
    }
];