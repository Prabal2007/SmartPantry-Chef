export const INGREDIENT_CATEGORIES = [
  {
    id: 'carbs',
    name: 'Carbs & Grains',
    icon: '🌾',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    presets: [
      'Rice', 'Oats', 'Wheat / Atta', 'Bread', 'Pasta', 'Quinoa', 'Tortilla', 'Couscous', 'Sweet Potato', 'Poha'
    ]
  },
  {
    id: 'proteins',
    name: 'Proteins & Legumes',
    icon: '🥩',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800 hover:bg-rose-200',
    presets: [
      'Eggs', 'Chicken Breast', 'Paneer', 'Tofu', 'Lentils / Dal', 'Chickpeas', 'Fish Fillet', 'Black Beans', 'Greek Yogurt', 'Protein Powder'
    ]
  },
  {
    id: 'veggies',
    name: 'Vegetables & Fruits',
    icon: '🥦',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    presets: [
      'Onion', 'Tomato', 'Spinach', 'Potato', 'Broccoli', 'Lemon', 'Garlic', 'Bell Pepper', 'Carrot', 'Mushroom', 'Avocado', 'Banana'
    ]
  },
  {
    id: 'dairy',
    name: 'Dairy & Healthy Fats',
    icon: '🥛',
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    badgeBg: 'bg-sky-100 text-sky-800 hover:bg-sky-200',
    presets: [
      'Milk', 'Yogurt', 'Olive Oil', 'Butter', 'Ghee', 'Cheddar Cheese', 'Almond Milk', 'Peanut Butter', 'Coconut Oil', 'Cream'
    ]
  },
  {
    id: 'spices',
    name: 'Spices & Staples',
    icon: '🧂',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    presets: [
      'Salt', 'Black Pepper', 'Turmeric', 'Cumin', 'Ginger', 'Soy Sauce', 'Chili Powder', 'Garam Masala', 'Oregano', 'Honey', 'Mustard'
    ]
  }
];

export const INITIAL_PANTRY_ITEMS = [
  // Carbs
  { id: '1', name: 'Rice', category: 'carbs' },
  { id: '2', name: 'Oats', category: 'carbs' },
  { id: '3', name: 'Wheat / Atta', category: 'carbs' },
  { id: '4', name: 'Bread', category: 'carbs' },
  
  // Proteins
  { id: '5', name: 'Eggs', category: 'proteins' },
  { id: '6', name: 'Chicken Breast', category: 'proteins' },
  { id: '7', name: 'Paneer', category: 'proteins' },
  { id: '8', name: 'Lentils / Dal', category: 'proteins' },

  // Veggies
  { id: '9', name: 'Onion', category: 'veggies' },
  { id: '10', name: 'Tomato', category: 'veggies' },
  { id: '11', name: 'Spinach', category: 'veggies' },
  { id: '12', name: 'Potato', category: 'veggies' },
  { id: '13', name: 'Garlic', category: 'veggies' },
  { id: '14', name: 'Lemon', category: 'veggies' },

  // Dairy & Fats
  { id: '15', name: 'Milk', category: 'dairy' },
  { id: '16', name: 'Yogurt', category: 'dairy' },
  { id: '17', name: 'Olive Oil', category: 'dairy' },
  { id: '18', name: 'Butter', category: 'dairy' },

  // Spices
  { id: '19', name: 'Salt', category: 'spices' },
  { id: '20', name: 'Black Pepper', category: 'spices' },
  { id: '21', name: 'Turmeric', category: 'spices' },
  { id: '22', name: 'Cumin', category: 'spices' },
  { id: '23', name: 'Ginger', category: 'spices' }
];
