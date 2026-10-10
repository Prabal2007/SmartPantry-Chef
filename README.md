# 🥗 SmartPantry Chef

An AI-powered kitchen inventory manager and nutrient-balanced meal planner built with React (Vite), Tailwind CSS, and Lucide React icons.

## ✨ Features

- 🥑 **Categorized Kitchen Inventory**: Add pantry, fridge, and spice staples across 5 core categories with 1-tap quick preset pills.
- 📅 **1-Day & 7-Day Meal Chart Generation**: Instantly plan macro-calculated meals (Breakfast, Lunch, Dinner, Snack) tailored to your available pantry items.
- ⚡ **Pantry Strictness**: Choose between **Strict Pantry Only** (0 missing items) or **Flexible Mode** (allows 2-3 common staples/garnishes).
- 🥗 **Dietary Preferences**: Support for Balanced, Vegetarian, High-Protein, Vegan, Low-Carb, and Non-Vegetarian diets.
- 📊 **Daily Nutrient Summary**: Visual progress bars comparing generated meal chart macros (Calories, Protein, Carbs, Fats) against RDA baselines.
- 🛒 **Missing Groceries Drawer**: Aggregated shopping checklist with interactive check-offs and one-click copy to clipboard.
- 🤖 **AI Integration**: Powered by dynamic client-side fallback generation engine + optional Google Gemini LLM API integration.

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/visheshsharma8840-hue/SmartPantry-Chef.git
cd SmartPantry-Chef

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠 Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Canvas Confetti
