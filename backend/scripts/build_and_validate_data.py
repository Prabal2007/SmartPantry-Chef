import json
import os
import sys

# Raw Food Database (50 Indian Household Staples)
# All values per 100g (or 100ml) or per 1 piece
RAW_FOODS = [
    # --- PROTEINS & LEGUMES ---
    {
        "id": "soya_chunks",
        "name": "Soya Chunks",
        "category": "protein",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 13.0,
        "protein_per_100": 52.0,
        "carbs_per_100": 33.0,
        "fats_per_100": 0.5,
        "fiber_per_100": 13.0,
        "budget_tier": "essential"
    },
    {
        "id": "eggs",
        "name": "Whole Eggs",
        "category": "protein",
        "diet_tags": ["egg"],
        "unit": "piece",
        "price_per_100g_or_unit_inr": 7.0,
        "protein_per_100": 6.3,
        "carbs_per_100": 0.4,
        "fats_per_100": 5.0,
        "fiber_per_100": 0.0,
        "budget_tier": "essential"
    },
    {
        "id": "egg_whites",
        "name": "Egg Whites",
        "category": "protein",
        "diet_tags": ["egg"],
        "unit": "piece",
        "price_per_100g_or_unit_inr": 5.0,
        "protein_per_100": 3.6,
        "carbs_per_100": 0.2,
        "fats_per_100": 0.1,
        "fiber_per_100": 0.0,
        "budget_tier": "essential"
    },
    {
        "id": "chicken_breast",
        "name": "Chicken Breast (Boneless)",
        "category": "protein",
        "diet_tags": ["non_veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 26.0,
        "protein_per_100": 31.0,
        "carbs_per_100": 0.0,
        "fats_per_100": 3.6,
        "fiber_per_100": 0.0,
        "budget_tier": "mid"
    },
    {
        "id": "paneer",
        "name": "Fresh Paneer (Cottage Cheese)",
        "category": "protein",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 25.0,
        "protein_per_100": 18.0,
        "carbs_per_100": 4.0,
        "fats_per_100": 20.0,
        "fiber_per_100": 0.0,
        "budget_tier": "mid"
    },
    {
        "id": "tofu",
        "name": "Firm Tofu",
        "category": "protein",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 20.0,
        "protein_per_100": 12.0,
        "carbs_per_100": 2.0,
        "fats_per_100": 5.0,
        "fiber_per_100": 1.2,
        "budget_tier": "mid"
    },
    {
        "id": "moong_dal",
        "name": "Yellow Moong Dal (Split)",
        "category": "protein",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 15.0,
        "protein_per_100": 24.0,
        "carbs_per_100": 60.0,
        "fats_per_100": 1.2,
        "fiber_per_100": 16.0,
        "budget_tier": "essential"
    },
    {
        "id": "toor_dal",
        "name": "Toor / Arhar Dal",
        "category": "protein",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 16.0,
        "protein_per_100": 22.0,
        "carbs_per_100": 62.0,
        "fats_per_100": 1.5,
        "fiber_per_100": 15.0,
        "budget_tier": "essential"
    },
    {
        "id": "chana_black",
        "name": "Kala Chana (Brown Chickpeas)",
        "category": "protein",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 11.0,
        "protein_per_100": 20.0,
        "carbs_per_100": 60.0,
        "fats_per_100": 5.0,
        "fiber_per_100": 17.0,
        "budget_tier": "essential"
    },
    {
        "id": "chickpeas_kabuli",
        "name": "White Chickpeas / Chole",
        "category": "protein",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 14.0,
        "protein_per_100": 19.0,
        "carbs_per_100": 61.0,
        "fats_per_100": 6.0,
        "fiber_per_100": 17.0,
        "budget_tier": "essential"
    },
    {
        "id": "rajma",
        "name": "Red Kidney Beans (Rajma)",
        "category": "protein",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 15.0,
        "protein_per_100": 22.0,
        "carbs_per_100": 60.0,
        "fats_per_100": 1.0,
        "fiber_per_100": 15.0,
        "budget_tier": "essential"
    },
    {
        "id": "roasted_chana",
        "name": "Roasted Chana (Bhuna Chana)",
        "category": "protein",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 14.0,
        "protein_per_100": 22.5,
        "carbs_per_100": 58.0,
        "fats_per_100": 5.5,
        "fiber_per_100": 16.0,
        "budget_tier": "essential"
    },
    {
        "id": "fish_rohu",
        "name": "Rohu Fish Fillet",
        "category": "protein",
        "diet_tags": ["non_veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 25.0,
        "protein_per_100": 17.0,
        "carbs_per_100": 0.0,
        "fats_per_100": 2.0,
        "fiber_per_100": 0.0,
        "budget_tier": "mid"
    },
    {
        "id": "whey_protein",
        "name": "Whey Protein Isolate/Concentrate",
        "category": "protein",
        "diet_tags": ["veg"],
        "unit": "piece",
        "price_per_100g_or_unit_inr": 80.0, # per 30g scoop
        "protein_per_100": 24.0,
        "carbs_per_100": 3.0,
        "fats_per_100": 1.5,
        "fiber_per_100": 0.5,
        "budget_tier": "premium"
    },

    # --- GRAINS & CARBS ---
    {
        "id": "wheat_atta",
        "name": "Whole Wheat Flour (Atta)",
        "category": "grain",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 4.5,
        "protein_per_100": 12.0,
        "carbs_per_100": 72.0,
        "fats_per_100": 1.7,
        "fiber_per_100": 11.0,
        "budget_tier": "essential"
    },
    {
        "id": "rice_white",
        "name": "White Basmati/Sona Masoori Rice",
        "category": "grain",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 6.0,
        "protein_per_100": 7.0,
        "carbs_per_100": 78.0,
        "fats_per_100": 0.6,
        "fiber_per_100": 1.3,
        "budget_tier": "essential"
    },
    {
        "id": "oats_rolled",
        "name": "Rolled / Instant Oats",
        "category": "grain",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 18.0,
        "protein_per_100": 13.5,
        "carbs_per_100": 66.0,
        "fats_per_100": 7.0,
        "fiber_per_100": 10.0,
        "budget_tier": "mid"
    },
    {
        "id": "poha",
        "name": "Flattened Rice (Poha)",
        "category": "grain",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 7.0,
        "protein_per_100": 7.0,
        "carbs_per_100": 77.0,
        "fats_per_100": 1.0,
        "fiber_per_100": 2.0,
        "budget_tier": "essential"
    },
    {
        "id": "bread_wheat",
        "name": "Whole Wheat Bread Slice",
        "category": "grain",
        "diet_tags": ["veg"],
        "unit": "piece",
        "price_per_100g_or_unit_inr": 3.5,
        "protein_per_100": 3.5,
        "carbs_per_100": 14.0,
        "fats_per_100": 1.0,
        "fiber_per_100": 2.0,
        "budget_tier": "essential"
    },
    {
        "id": "besan",
        "name": "Gram Flour (Besan)",
        "category": "grain",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 10.0,
        "protein_per_100": 22.0,
        "carbs_per_100": 58.0,
        "fats_per_100": 5.5,
        "fiber_per_100": 10.0,
        "budget_tier": "essential"
    },
    {
        "id": "suji_semolina",
        "name": "Semolina (Rava / Suji)",
        "category": "grain",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 6.0,
        "protein_per_100": 12.0,
        "carbs_per_100": 73.0,
        "fats_per_100": 1.0,
        "fiber_per_100": 4.0,
        "budget_tier": "essential"
    },
    {
        "id": "sweet_potato",
        "name": "Sweet Potato (Shakarkandi)",
        "category": "grain",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 6.0,
        "protein_per_100": 1.6,
        "carbs_per_100": 20.0,
        "fats_per_100": 0.1,
        "fiber_per_100": 3.0,
        "budget_tier": "essential"
    },
    {
        "id": "potato",
        "name": "Potato (Aloo)",
        "category": "grain",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 3.5,
        "protein_per_100": 2.0,
        "carbs_per_100": 17.0,
        "fats_per_100": 0.1,
        "fiber_per_100": 2.2,
        "budget_tier": "essential"
    },

    # --- VEGETABLES ---
    {
        "id": "spinach",
        "name": "Fresh Spinach (Palak)",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 4.0,
        "protein_per_100": 2.9,
        "carbs_per_100": 3.6,
        "fats_per_100": 0.4,
        "fiber_per_100": 2.2,
        "budget_tier": "essential"
    },
    {
        "id": "onion",
        "name": "Red Onion (Pyaz)",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 4.0,
        "protein_per_100": 1.1,
        "carbs_per_100": 9.3,
        "fats_per_100": 0.1,
        "fiber_per_100": 1.7,
        "budget_tier": "essential"
    },
    {
        "id": "tomato",
        "name": "Fresh Tomato (Tamatar)",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 4.0,
        "protein_per_100": 0.9,
        "carbs_per_100": 3.9,
        "fats_per_100": 0.2,
        "fiber_per_100": 1.2,
        "budget_tier": "essential"
    },
    {
        "id": "broccoli",
        "name": "Fresh Broccoli",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 12.0,
        "protein_per_100": 2.8,
        "carbs_per_100": 6.6,
        "fats_per_100": 0.4,
        "fiber_per_100": 2.6,
        "budget_tier": "mid"
    },
    {
        "id": "carrot",
        "name": "Carrot (Gajar)",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 5.0,
        "protein_per_100": 0.9,
        "carbs_per_100": 9.6,
        "fats_per_100": 0.2,
        "fiber_per_100": 2.8,
        "budget_tier": "essential"
    },
    {
        "id": "capsicum",
        "name": "Green Capsicum / Bell Pepper",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 8.0,
        "protein_per_100": 1.3,
        "carbs_per_100": 4.6,
        "fats_per_100": 0.2,
        "fiber_per_100": 1.7,
        "budget_tier": "essential"
    },
    {
        "id": "cucumber",
        "name": "Cucumber (Kheera)",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 4.0,
        "protein_per_100": 0.7,
        "carbs_per_100": 3.6,
        "fats_per_100": 0.1,
        "fiber_per_100": 0.5,
        "budget_tier": "essential"
    },
    {
        "id": "lauki",
        "name": "Bottle Gourd (Lauki / Ghia)",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 4.0,
        "protein_per_100": 0.6,
        "carbs_per_100": 3.4,
        "fats_per_100": 0.1,
        "fiber_per_100": 1.2,
        "budget_tier": "essential"
    },
    {
        "id": "bhindi",
        "name": "Okra (Bhindi / Ladyfinger)",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 6.0,
        "protein_per_100": 1.9,
        "carbs_per_100": 7.5,
        "fats_per_100": 0.2,
        "fiber_per_100": 3.2,
        "budget_tier": "essential"
    },
    {
        "id": "cauliflower",
        "name": "Cauliflower (Gobi)",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 5.0,
        "protein_per_100": 1.9,
        "carbs_per_100": 5.0,
        "fats_per_100": 0.3,
        "fiber_per_100": 2.0,
        "budget_tier": "essential"
    },
    {
        "id": "green_peas",
        "name": "Green Peas (Matar)",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 8.0,
        "protein_per_100": 5.4,
        "carbs_per_100": 14.5,
        "fats_per_100": 0.4,
        "fiber_per_100": 5.7,
        "budget_tier": "essential"
    },
    {
        "id": "mushrooms",
        "name": "Button Mushrooms",
        "category": "vegetable",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 18.0,
        "protein_per_100": 3.1,
        "carbs_per_100": 3.3,
        "fats_per_100": 0.3,
        "fiber_per_100": 1.0,
        "budget_tier": "mid"
    },

    # --- FRUITS ---
    {
        "id": "banana",
        "name": "Banana (Kela)",
        "category": "fruit",
        "diet_tags": ["veg"],
        "unit": "piece",
        "price_per_100g_or_unit_inr": 6.0,
        "protein_per_100": 1.3,
        "carbs_per_100": 27.0,
        "fats_per_100": 0.3,
        "fiber_per_100": 3.1,
        "budget_tier": "essential"
    },
    {
        "id": "apple",
        "name": "Apple (Seb)",
        "category": "fruit",
        "diet_tags": ["veg"],
        "unit": "piece",
        "price_per_100g_or_unit_inr": 25.0,
        "protein_per_100": 0.5,
        "carbs_per_100": 25.0,
        "fats_per_100": 0.3,
        "fiber_per_100": 4.4,
        "budget_tier": "mid"
    },
    {
        "id": "papaya",
        "name": "Fresh Papaya (Papita)",
        "category": "fruit",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 6.0,
        "protein_per_100": 0.5,
        "carbs_per_100": 11.0,
        "fats_per_100": 0.1,
        "fiber_per_100": 1.7,
        "budget_tier": "essential"
    },
    {
        "id": "guava",
        "name": "Guava (Amrood)",
        "category": "fruit",
        "diet_tags": ["veg"],
        "unit": "piece",
        "price_per_100g_or_unit_inr": 10.0,
        "protein_per_100": 2.6,
        "carbs_per_100": 14.0,
        "fats_per_100": 1.0,
        "fiber_per_100": 5.4,
        "budget_tier": "essential"
    },
    {
        "id": "pomegranate",
        "name": "Pomegranate (Anaar)",
        "category": "fruit",
        "diet_tags": ["veg"],
        "unit": "piece",
        "price_per_100g_or_unit_inr": 30.0,
        "protein_per_100": 1.7,
        "carbs_per_100": 19.0,
        "fats_per_100": 1.2,
        "fiber_per_100": 4.0,
        "budget_tier": "premium"
    },
    {
        "id": "orange",
        "name": "Orange / Santra",
        "category": "fruit",
        "diet_tags": ["veg"],
        "unit": "piece",
        "price_per_100g_or_unit_inr": 12.0,
        "protein_per_100": 1.2,
        "carbs_per_100": 15.0,
        "fats_per_100": 0.2,
        "fiber_per_100": 3.1,
        "budget_tier": "mid"
    },

    # --- DAIRY, FATS & BASICS ---
    {
        "id": "milk",
        "name": "Toned Cow Milk",
        "category": "dairy_fat",
        "diet_tags": ["veg"],
        "unit": "ml",
        "price_per_100g_or_unit_inr": 6.0,
        "protein_per_100": 3.3,
        "carbs_per_100": 4.8,
        "fats_per_100": 3.0,
        "fiber_per_100": 0.0,
        "budget_tier": "essential"
    },
    {
        "id": "curd",
        "name": "Plain Curd / Dahi",
        "category": "dairy_fat",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 7.0,
        "protein_per_100": 3.5,
        "carbs_per_100": 4.0,
        "fats_per_100": 3.0,
        "fiber_per_100": 0.0,
        "budget_tier": "essential"
    },
    {
        "id": "hung_curd",
        "name": "Hung Curd / Greek Style Yogurt",
        "category": "dairy_fat",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 20.0,
        "protein_per_100": 10.0,
        "carbs_per_100": 3.6,
        "fats_per_100": 0.4,
        "fiber_per_100": 0.0,
        "budget_tier": "premium"
    },
    {
        "id": "peanuts",
        "name": "Roasted Peanuts (Moongphali)",
        "category": "dairy_fat",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 18.0,
        "protein_per_100": 25.8,
        "carbs_per_100": 16.1,
        "fats_per_100": 49.2,
        "fiber_per_100": 8.5,
        "budget_tier": "essential"
    },
    {
        "id": "peanut_butter",
        "name": "Natural Peanut Butter",
        "category": "dairy_fat",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 35.0,
        "protein_per_100": 25.0,
        "carbs_per_100": 20.0,
        "fats_per_100": 50.0,
        "fiber_per_100": 6.0,
        "budget_tier": "mid"
    },
    {
        "id": "mustard_oil",
        "name": "Mustard / Cooking Oil",
        "category": "dairy_fat",
        "diet_tags": ["veg"],
        "unit": "ml",
        "price_per_100g_or_unit_inr": 18.0,
        "protein_per_100": 0.0,
        "carbs_per_100": 0.0,
        "fats_per_100": 100.0,
        "fiber_per_100": 0.0,
        "budget_tier": "essential"
    },
    {
        "id": "ghee",
        "name": "Desi Cow Ghee",
        "category": "dairy_fat",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 65.0,
        "protein_per_100": 0.0,
        "carbs_per_100": 0.0,
        "fats_per_100": 99.5,
        "fiber_per_100": 0.0,
        "budget_tier": "mid"
    },
    {
        "id": "spices_basic",
        "name": "Indian Spices (Salt, Haldi, Jeera, Mirch)",
        "category": "dairy_fat",
        "diet_tags": ["veg"],
        "unit": "g",
        "price_per_100g_or_unit_inr": 2.0,
        "protein_per_100": 0.0,
        "carbs_per_100": 0.0,
        "fats_per_100": 0.0,
        "fiber_per_100": 0.0,
        "budget_tier": "essential"
    }
]

# Ensure Strict Calorie-Macro Identity on raw foods
for f in RAW_FOODS:
    f["calories_per_100"] = round((f["protein_per_100"] * 4) + (f["carbs_per_100"] * 4) + (f["fats_per_100"] * 9))

FOOD_MAP = {f["id"]: f for f in RAW_FOODS}

# 40 Practical Indian Household Dishes across Breakfast, Lunch, Snack, Dinner
# With exact ingredient quantities, prep time, recipe instructions
RAW_DISHES = [
    # --- BREAKFAST DISHES ---
    {
        "id": "masala_oats_milk",
        "name": "Masala Oats with Warm Milk",
        "slot": "breakfast",
        "diet_type": "veg",
        "prep_time_mins": 10,
        "ingredients": [
            {"food_id": "oats_rolled", "amount": 60},
            {"food_id": "milk", "amount": 200},
            {"food_id": "onion", "amount": 30},
            {"food_id": "tomato", "amount": 30},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Dry roast oats in a pan for 2 minutes.",
            "Add chopped onions, tomatoes, salt and turmeric with 150ml water.",
            "Simmer for 4-5 minutes until thick.",
            "Serve hot alongside 200ml warmed toned milk."
        ]
    },
    {
        "id": "boiled_eggs_banana_shake",
        "name": "Boiled Eggs & Banana Milk Shake",
        "slot": "breakfast",
        "diet_type": "eggetarian",
        "prep_time_mins": 12,
        "ingredients": [
            {"food_id": "eggs", "amount": 3},
            {"food_id": "banana", "amount": 1},
            {"food_id": "milk", "amount": 200}
        ],
        "recipe_steps": [
            "Boil 3 whole eggs for 9-10 minutes, cool in cold water and peel.",
            "Blend 1 ripe banana with 200ml chilled toned milk until smooth.",
            "Season eggs with black pepper and pinch of salt, serve together."
        ]
    },
    {
        "id": "egg_bhurji_roti",
        "name": "High-Protein Egg Bhurji with Wheat Roti",
        "slot": "breakfast",
        "diet_type": "eggetarian",
        "prep_time_mins": 15,
        "ingredients": [
            {"food_id": "eggs", "amount": 3},
            {"food_id": "wheat_atta", "amount": 60},
            {"food_id": "onion", "amount": 50},
            {"food_id": "tomato", "amount": 50},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Knead wheat flour with water and roll into 2 soft rotis on a hot tawa.",
            "Heat 5ml mustard oil, saute diced onions, tomatoes, and basic spices.",
            "Crack 3 whole eggs into the pan and scramble on medium flame until cooked.",
            "Serve hot with freshly cooked rotis."
        ]
    },
    {
        "id": "besan_chilla_curd",
        "name": "Savory Besan Chilla with Fresh Curd",
        "slot": "breakfast",
        "diet_type": "veg",
        "prep_time_mins": 15,
        "ingredients": [
            {"food_id": "besan", "amount": 70},
            {"food_id": "curd", "amount": 100},
            {"food_id": "onion", "amount": 40},
            {"food_id": "tomato", "amount": 40},
            {"food_id": "spinach", "amount": 30},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Whisk besan with water, spices, chopped onions, tomatoes, and shredded spinach into a pourable batter.",
            "Grease a hot pan with 5ml mustard oil and pour batter to make 2 crisp chillas.",
            "Flip and cook both sides until golden brown.",
            "Serve warm with 100g fresh curd."
        ]
    },
    {
        "id": "paneer_bhurji_toast",
        "name": "Spiced Paneer Bhurji with Whole Wheat Toast",
        "slot": "breakfast",
        "diet_type": "veg",
        "prep_time_mins": 12,
        "ingredients": [
            {"food_id": "paneer", "amount": 100},
            {"food_id": "bread_wheat", "amount": 2},
            {"food_id": "onion", "amount": 40},
            {"food_id": "tomato", "amount": 40},
            {"food_id": "capsicum", "amount": 30},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Crumble fresh paneer by hand.",
            "Heat oil in a pan, saute diced onions, tomatoes, and capsicum with turmeric and jeera.",
            "Add crumbled paneer, cook gently for 3-4 minutes so it remains juicy.",
            "Toast 2 wheat bread slices and serve together."
        ]
    },
    {
        "id": "poha_peanuts_boiled_eggs",
        "name": "Classic Kanda Poha with Peanuts & Boiled Eggs",
        "slot": "breakfast",
        "diet_type": "eggetarian",
        "prep_time_mins": 15,
        "ingredients": [
            {"food_id": "poha", "amount": 60},
            {"food_id": "peanuts", "amount": 20},
            {"food_id": "eggs", "amount": 2},
            {"food_id": "onion", "amount": 50},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Rinse poha in a colander and drain completely.",
            "Heat mustard oil, fry peanuts until crunchy, then add chopped onions and turmeric.",
            "Add drained poha and salt, toss gently on low heat for 3 minutes.",
            "Serve with 2 hard-boiled whole eggs."
        ]
    },
    {
        "id": "banana_peanut_butter_oats",
        "name": "Banana Peanut Butter Protein Oats",
        "slot": "breakfast",
        "diet_type": "veg",
        "prep_time_mins": 8,
        "ingredients": [
            {"food_id": "oats_rolled", "amount": 60},
            {"food_id": "milk", "amount": 200},
            {"food_id": "peanut_butter", "amount": 20},
            {"food_id": "banana", "amount": 1}
        ],
        "recipe_steps": [
            "Cook rolled oats in 200ml milk on medium flame for 5 minutes.",
            "Turn off heat and stir in 20g natural peanut butter.",
            "Top with 1 sliced banana and serve warm."
        ]
    },
    {
        "id": "egg_omelette_toast_fruit",
        "name": "Fluffy 3-Egg Omelette with Toast & Orange",
        "slot": "breakfast",
        "diet_type": "eggetarian",
        "prep_time_mins": 12,
        "ingredients": [
            {"food_id": "eggs", "amount": 3},
            {"food_id": "bread_wheat", "amount": 2},
            {"food_id": "onion", "amount": 30},
            {"food_id": "tomato", "amount": 30},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "orange", "amount": 1},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Whisk 3 eggs with diced onions, tomatoes, salt, and black pepper.",
            "Heat 5ml mustard oil in a non-stick pan, pour egg mix, and cook both sides until golden.",
            "Serve with 2 toasted wheat bread slices and 1 fresh orange."
        ]
    },
    {
        "id": "suji_upma_boiled_eggs",
        "name": "Vegetable Suji Upma with Boiled Eggs",
        "slot": "breakfast",
        "diet_type": "eggetarian",
        "prep_time_mins": 15,
        "ingredients": [
            {"food_id": "suji_semolina", "amount": 60},
            {"food_id": "eggs", "amount": 2},
            {"food_id": "onion", "amount": 40},
            {"food_id": "carrot", "amount": 40},
            {"food_id": "peanuts", "amount": 15},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Dry roast semolina until fragrant.",
            "Heat oil, saute peanuts, onions, carrots, and mustard seeds.",
            "Add 150ml boiling water, lower flame, and stir in roasted suji continuously without lumps.",
            "Serve with 2 boiled eggs on the side."
        ]
    },
    {
        "id": "whey_oats_banana_bowl",
        "name": "Whey Protein Oats Bowl with Banana",
        "slot": "breakfast",
        "diet_type": "veg",
        "prep_time_mins": 5,
        "ingredients": [
            {"food_id": "oats_rolled", "amount": 50},
            {"food_id": "whey_protein", "amount": 1}, # 1 scoop
            {"food_id": "milk", "amount": 150},
            {"food_id": "banana", "amount": 1}
        ],
        "recipe_steps": [
            "Microwave or cook oats in 150ml milk for 3 minutes.",
            "Let cool for 1 minute, then fold in 1 scoop of whey protein until smooth.",
            "Top with fresh banana slices."
        ]
    },

    # --- LUNCH DISHES ---
    {
        "id": "soya_pulao_curd",
        "name": "High-Protein Soya Chunk Pulao with Curd",
        "slot": "lunch",
        "diet_type": "veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "soya_chunks", "amount": 60},
            {"food_id": "rice_white", "amount": 75},
            {"food_id": "curd", "amount": 150},
            {"food_id": "onion", "amount": 50},
            {"food_id": "tomato", "amount": 50},
            {"food_id": "mustard_oil", "amount": 6},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Boil soya chunks in salted water for 5 minutes, rinse thoroughly, and squeeze out excess moisture.",
            "Heat 6ml mustard oil, saute onions, tomatoes, and garam masala.",
            "Add soya chunks, washed rice, and 180ml water; cook in pressure cooker for 2 whistles.",
            "Serve hot with 150g chilled plain curd."
        ]
    },
    {
        "id": "dal_tadka_rice_salad",
        "name": "Yellow Dal Tadka, Steamed Rice & Cucumber Salad",
        "slot": "lunch",
        "diet_type": "veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "moong_dal", "amount": 70},
            {"food_id": "rice_white", "amount": 75},
            {"food_id": "cucumber", "amount": 100},
            {"food_id": "tomato", "amount": 50},
            {"food_id": "onion", "amount": 40},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Pressure cook moong dal with turmeric and salt until tender.",
            "Prepare tadka with 5ml mustard oil, jeera, chopped onions, and tomatoes, then pour over dal.",
            "Steam rice with double volume of water.",
            "Slice cucumber and season with lemon and salt for salad."
        ]
    },
    {
        "id": "chicken_breast_rice_stirfry",
        "name": "Pan-Seared Chicken Breast with Rice & Stir-Fry Veggies",
        "slot": "lunch",
        "diet_type": "non_veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "chicken_breast", "amount": 160},
            {"food_id": "rice_white", "amount": 70},
            {"food_id": "broccoli", "amount": 80},
            {"food_id": "carrot", "amount": 60},
            {"food_id": "mustard_oil", "amount": 6},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Season chicken breast with black pepper, salt, and a dash of turmeric.",
            "Pan-sear chicken in 4ml hot oil for 6-7 minutes on each side until cooked through and juicy.",
            "In the same pan, toss broccoli florets and sliced carrots with 2ml oil on high heat for 3 minutes.",
            "Serve alongside freshly steamed white rice."
        ]
    },
    {
        "id": "rajma_masala_rice_curd",
        "name": "Punjabi Rajma Masala with Steamed Rice & Curd",
        "slot": "lunch",
        "diet_type": "veg",
        "prep_time_mins": 35,
        "ingredients": [
            {"food_id": "rajma", "amount": 70},
            {"food_id": "rice_white", "amount": 70},
            {"food_id": "curd", "amount": 100},
            {"food_id": "onion", "amount": 60},
            {"food_id": "tomato", "amount": 60},
            {"food_id": "mustard_oil", "amount": 6},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Soak rajma overnight and pressure cook until completely soft.",
            "In 6ml oil, saute finely chopped onions and tomatoes with ginger-garlic and spices until oil separates.",
            "Add cooked rajma and simmer on low flame for 12 minutes to thicken gravy.",
            "Serve hot with steamed rice and 100g curd."
        ]
    },
    {
        "id": "chole_rice_cucumber",
        "name": "Kabuli Chole Masala with Steamed Rice & Cucumber",
        "slot": "lunch",
        "diet_type": "veg",
        "prep_time_mins": 30,
        "ingredients": [
            {"food_id": "chickpeas_kabuli", "amount": 70},
            {"food_id": "rice_white", "amount": 70},
            {"food_id": "cucumber", "amount": 80},
            {"food_id": "onion", "amount": 50},
            {"food_id": "tomato", "amount": 50},
            {"food_id": "mustard_oil", "amount": 6},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Boil soaked chickpeas until tender.",
            "Saute onions, tomatoes, and chole spices in 6ml oil.",
            "Add boiled chana with cooking broth and simmer for 10 minutes.",
            "Plate with hot steamed rice and sliced cucumber."
        ]
    },
    {
        "id": "kala_chana_curry_roti",
        "name": "Kala Chana Gravy Curry with 3 Wheat Rotis",
        "slot": "lunch",
        "diet_type": "veg",
        "prep_time_mins": 30,
        "ingredients": [
            {"food_id": "chana_black", "amount": 70},
            {"food_id": "wheat_atta", "amount": 75},
            {"food_id": "onion", "amount": 50},
            {"food_id": "tomato", "amount": 50},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Boil brown chana with salt in a pressure cooker.",
            "Prepare onion-tomato gravy with Indian spices in 5ml mustard oil.",
            "Add boiled chana and simmer for 8 minutes.",
            "Prepare 3 whole wheat rotis and serve hot."
        ]
    },
    {
        "id": "egg_curry_steamed_rice",
        "name": "Homestyle Egg Curry (3 Eggs) with Steamed Rice",
        "slot": "lunch",
        "diet_type": "eggetarian",
        "prep_time_mins": 20,
        "ingredients": [
            {"food_id": "eggs", "amount": 3},
            {"food_id": "rice_white", "amount": 75},
            {"food_id": "onion", "amount": 50},
            {"food_id": "tomato", "amount": 50},
            {"food_id": "mustard_oil", "amount": 6},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Boil and peel 3 eggs, prick lightly, and sear in 2ml oil with turmeric.",
            "Saute onions and tomatoes in remaining oil with curry spices until fragrant.",
            "Add 150ml water, simmer eggs in gravy for 6 minutes.",
            "Serve hot with steamed rice."
        ]
    },
    {
        "id": "paneer_matar_roti",
        "name": "Matar Paneer with Whole Wheat Rotis",
        "slot": "lunch",
        "diet_type": "veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "paneer", "amount": 100},
            {"food_id": "green_peas", "amount": 60},
            {"food_id": "wheat_atta", "amount": 70},
            {"food_id": "onion", "amount": 40},
            {"food_id": "tomato", "amount": 50},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Saute onions and tomato puree with garam masala in 5ml oil.",
            "Add green peas and 100ml water, cook until peas are tender.",
            "Add paneer cubes and simmer on low flame for 4 minutes.",
            "Serve with freshly puffed whole wheat rotis."
        ]
    },
    {
        "id": "chicken_curry_roti",
        "name": "Rustic Chicken Curry with Wheat Roti",
        "slot": "lunch",
        "diet_type": "non_veg",
        "prep_time_mins": 30,
        "ingredients": [
            {"food_id": "chicken_breast", "amount": 160},
            {"food_id": "wheat_atta", "amount": 75},
            {"food_id": "onion", "amount": 60},
            {"food_id": "tomato", "amount": 60},
            {"food_id": "mustard_oil", "amount": 6},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Cut chicken breast into curry cubes.",
            "Saute onions and tomatoes in 6ml mustard oil with coriander, cumin, and chili powder.",
            "Add chicken pieces, sear for 4 minutes, add 150ml warm water, and simmer covered for 12 minutes.",
            "Serve with 3 soft wheat rotis."
        ]
    },
    {
        "id": "tofu_veggie_fried_rice",
        "name": "High-Protein Tofu & Mixed Veggie Fried Rice",
        "slot": "lunch",
        "diet_type": "veg",
        "prep_time_mins": 20,
        "ingredients": [
            {"food_id": "tofu", "amount": 130},
            {"food_id": "rice_white", "amount": 70},
            {"food_id": "capsicum", "amount": 50},
            {"food_id": "carrot", "amount": 50},
            {"food_id": "onion", "amount": 40},
            {"food_id": "mustard_oil", "amount": 6},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Press and cube firm tofu, sear in 3ml oil until golden.",
            "In same wok, toss sliced onions, carrots, and capsicum with remaining 3ml oil on high heat.",
            "Add cooked rice, spices, and tossed tofu, stir-fry on high flame for 2 minutes.",
            "Serve hot."
        ]
    },
    {
        "id": "fish_curry_rice",
        "name": "Bengali Style Rohu Fish Curry with Steamed Rice",
        "slot": "lunch",
        "diet_type": "non_veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "fish_rohu", "amount": 160},
            {"food_id": "rice_white", "amount": 75},
            {"food_id": "potato", "amount": 60},
            {"food_id": "tomato", "amount": 50},
            {"food_id": "mustard_oil", "amount": 6},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Marinate fish with turmeric and salt, shallow fry lightly in 3ml oil.",
            "Saute potatoes, tomatoes, and jeera in remaining 3ml mustard oil.",
            "Add 200ml water, bring to boil, gently slide fish pieces in and simmer for 6 minutes.",
            "Serve with hot steamed rice."
        ]
    },

    # --- SNACK DISHES ---
    {
        "id": "roasted_chana_peanuts",
        "name": "Crispy Roasted Chana & Peanut Mix",
        "slot": "snack",
        "diet_type": "veg",
        "prep_time_mins": 3,
        "ingredients": [
            {"food_id": "roasted_chana", "amount": 40},
            {"food_id": "peanuts", "amount": 25},
            {"food_id": "spices_basic", "amount": 2}
        ],
        "recipe_steps": [
            "Toss roasted chana and peanuts in a bowl.",
            "Sprinkle chaat masala or black salt and enjoy dry as a crunch snack."
        ]
    },
    {
        "id": "sprouted_moong_chaat",
        "name": "Zesty Sprouted Moong Dal Chaat",
        "slot": "snack",
        "diet_type": "veg",
        "prep_time_mins": 8,
        "ingredients": [
            {"food_id": "moong_dal", "amount": 45},
            {"food_id": "onion", "amount": 30},
            {"food_id": "tomato", "amount": 30},
            {"food_id": "cucumber", "amount": 40},
            {"food_id": "spices_basic", "amount": 3}
        ],
        "recipe_steps": [
            "Boil or steam sprouted moong dal for 3-4 minutes until tender-crisp.",
            "Finely dice onions, tomatoes, and cucumber.",
            "Toss together with lemon juice, black salt, and roasted cumin powder.",
            "Serve fresh."
        ]
    },
    {
        "id": "boiled_eggs_pepper",
        "name": "Hard-Boiled Eggs with Rock Salt & Pepper",
        "slot": "snack",
        "diet_type": "eggetarian",
        "prep_time_mins": 10,
        "ingredients": [
            {"food_id": "eggs", "amount": 3},
            {"food_id": "spices_basic", "amount": 2}
        ],
        "recipe_steps": [
            "Boil 3 eggs for 10 minutes in rolling water.",
            "Cool, peel, cut in halves and sprinkle crushed black pepper and rock salt."
        ]
    },
    {
        "id": "egg_white_spinach_scramble",
        "name": "Egg Whites & Baby Spinach Scramble",
        "slot": "snack",
        "diet_type": "eggetarian",
        "prep_time_mins": 8,
        "ingredients": [
            {"food_id": "egg_whites", "amount": 4},
            {"food_id": "spinach", "amount": 60},
            {"food_id": "onion", "amount": 30},
            {"food_id": "mustard_oil", "amount": 3},
            {"food_id": "spices_basic", "amount": 3}
        ],
        "recipe_steps": [
            "Heat 3ml oil, wilt chopped spinach and onions for 2 minutes.",
            "Pour in 4 egg whites seasoned with salt and pepper.",
            "Scramble gently until soft curds form, serve immediately."
        ]
    },
    {
        "id": "hung_curd_fruit_bowl",
        "name": "High-Protein Hung Curd & Fresh Fruit Bowl",
        "slot": "snack",
        "diet_type": "veg",
        "prep_time_mins": 5,
        "ingredients": [
            {"food_id": "hung_curd", "amount": 120},
            {"food_id": "banana", "amount": 1},
            {"food_id": "apple", "amount": 1}
        ],
        "recipe_steps": [
            "Whisk hung curd in a dessert bowl until creamy.",
            "Chop fresh banana and apple into bite-sized pieces.",
            "Layer fruit over hung curd and serve chilled."
        ]
    },
    {
        "id": "peanut_butter_toast_banana",
        "name": "Wheat Toast with Peanut Butter & Banana Slices",
        "slot": "snack",
        "diet_type": "veg",
        "prep_time_mins": 4,
        "ingredients": [
            {"food_id": "bread_wheat", "amount": 2},
            {"food_id": "peanut_butter", "amount": 25},
            {"food_id": "banana", "amount": 1}
        ],
        "recipe_steps": [
            "Toast 2 slices of whole wheat bread until crisp.",
            "Spread 25g natural peanut butter evenly across both slices.",
            "Top with sliced banana and serve."
        ]
    },
    {
        "id": "roasted_soya_chaat",
        "name": "Crunchy Pan-Roasted Soya Chunks Chaat",
        "slot": "snack",
        "diet_type": "veg",
        "prep_time_mins": 10,
        "ingredients": [
            {"food_id": "soya_chunks", "amount": 40},
            {"food_id": "onion", "amount": 30},
            {"food_id": "tomato", "amount": 30},
            {"food_id": "mustard_oil", "amount": 4},
            {"food_id": "spices_basic", "amount": 4}
        ],
        "recipe_steps": [
            "Soak soya chunks in hot water, squeeze dry, and cut into bite-sized pieces.",
            "Toss in 4ml hot oil with chaat masala until crispy on the edges.",
            "Mix in raw diced onions, tomatoes, and lemon juice."
        ]
    },
    {
        "id": "sweet_potato_boiled_chaat",
        "name": "Steamed Sweet Potato Chaat with Lemon",
        "slot": "snack",
        "diet_type": "veg",
        "prep_time_mins": 12,
        "ingredients": [
            {"food_id": "sweet_potato", "amount": 160},
            {"food_id": "spices_basic", "amount": 3}
        ],
        "recipe_steps": [
            "Boil or steam sweet potato until fork-tender.",
            "Peel skin and cut into rounds.",
            "Sprinkle roasted jeera powder, black salt, and squeeze fresh lemon juice."
        ]
    },
    {
        "id": "guava_roasted_chana",
        "name": "Fresh Guava Slices & Roasted Chana",
        "slot": "snack",
        "diet_type": "veg",
        "prep_time_mins": 3,
        "ingredients": [
            {"food_id": "guava", "amount": 1},
            {"food_id": "roasted_chana", "amount": 35},
            {"food_id": "spices_basic", "amount": 2}
        ],
        "recipe_steps": [
            "Wash and slice 1 fresh guava, sprinkle chaat masala.",
            "Serve with 35g crunchy roasted chana on the side."
        ]
    },

    # --- DINNER DISHES ---
    {
        "id": "palak_paneer_roti",
        "name": "Nutritious Palak Paneer with Whole Wheat Roti",
        "slot": "dinner",
        "diet_type": "veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "paneer", "amount": 100},
            {"food_id": "spinach", "amount": 150},
            {"food_id": "wheat_atta", "amount": 70},
            {"food_id": "onion", "amount": 40},
            {"food_id": "tomato", "amount": 40},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Blanch spinach leaves in boiling water for 2 minutes, then puree.",
            "Heat 5ml oil, saute onions, tomatoes, and garlic paste.",
            "Pour in spinach puree, simmer 4 minutes, then drop in fresh paneer cubes.",
            "Serve hot with 2-3 freshly puffed whole wheat rotis."
        ]
    },
    {
        "id": "soya_curry_roti",
        "name": "Spiced Soya Chunks Curry with 3 Wheat Rotis",
        "slot": "dinner",
        "diet_type": "veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "soya_chunks", "amount": 60},
            {"food_id": "wheat_atta", "amount": 75},
            {"food_id": "onion", "amount": 50},
            {"food_id": "tomato", "amount": 50},
            {"food_id": "potato", "amount": 50},
            {"food_id": "mustard_oil", "amount": 6},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Hydrate soya chunks in hot water, rinse, and squeeze dry.",
            "Saute diced onions, tomatoes, and potatoes with curry spices in 6ml oil.",
            "Add soya chunks with 150ml water and simmer until potato is cooked and gravy is thick.",
            "Serve with 3 soft wheat rotis."
        ]
    },
    {
        "id": "toor_dal_rice_bhindi",
        "name": "Toor Dal, Steamed Rice & Crisp Bhindi Fry",
        "slot": "dinner",
        "diet_type": "veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "toor_dal", "amount": 65},
            {"food_id": "rice_white", "amount": 70},
            {"food_id": "bhindi", "amount": 100},
            {"food_id": "onion", "amount": 30},
            {"food_id": "mustard_oil", "amount": 6},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Cook toor dal with haldi and salt in pressure cooker; temper with cumin and mustard seeds in 2ml oil.",
            "Chop bhindi and saute in 4ml hot oil with onions, amchur, and chili powder until crisp.",
            "Serve alongside steamed white rice."
        ]
    },
    {
        "id": "chicken_breast_roti_salad",
        "name": "Grilled Chicken Breast, Whole Wheat Roti & Salad",
        "slot": "dinner",
        "diet_type": "non_veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "chicken_breast", "amount": 160},
            {"food_id": "wheat_atta", "amount": 70},
            {"food_id": "cucumber", "amount": 80},
            {"food_id": "tomato", "amount": 50},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Marinate chicken with garlic, chili powder, salt, and 3ml oil.",
            "Grill or pan-sear on medium-high heat for 6-7 minutes per side.",
            "Make 2 whole wheat rotis on a tawa.",
            "Toss cucumber and tomatoes with black salt for a crisp side salad."
        ]
    },
    {
        "id": "tofu_palak_curry_roti",
        "name": "Tofu Palak (Vegan Palak Paneer) with Wheat Roti",
        "slot": "dinner",
        "diet_type": "veg",
        "prep_time_mins": 22,
        "ingredients": [
            {"food_id": "tofu", "amount": 120},
            {"food_id": "spinach", "amount": 150},
            {"food_id": "wheat_atta", "amount": 70},
            {"food_id": "onion", "amount": 40},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Puree blanched spinach leaves.",
            "Saute chopped onions with spices in 5ml mustard oil, pour in spinach puree.",
            "Simmer for 4 minutes, add cubed tofu and cook for 3 minutes.",
            "Serve with whole wheat rotis."
        ]
    },
    {
        "id": "curd_rice_soya_fry",
        "name": "Tempered Curd Rice with Crispy Soya Fry",
        "slot": "dinner",
        "diet_type": "veg",
        "prep_time_mins": 20,
        "ingredients": [
            {"food_id": "rice_white", "amount": 70},
            {"food_id": "curd", "amount": 150},
            {"food_id": "soya_chunks", "amount": 50},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Mash cooked rice with fresh curd, season with salt and tempered mustard seeds in 2ml oil.",
            "Boil, squeeze, and pan-fry soya chunks with red chili and salt in 3ml oil until crunchy.",
            "Serve the cool curd rice with hot crispy soya on top."
        ]
    },
    {
        "id": "paneer_bhurji_roti_salad",
        "name": "Paneer Bhurji with 3 Wheat Rotis & Kheera Salad",
        "slot": "dinner",
        "diet_type": "veg",
        "prep_time_mins": 20,
        "ingredients": [
            {"food_id": "paneer", "amount": 100},
            {"food_id": "wheat_atta", "amount": 75},
            {"food_id": "cucumber", "amount": 80},
            {"food_id": "onion", "amount": 40},
            {"food_id": "tomato", "amount": 40},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Saute onions and tomatoes in 5ml oil with turmeric and garam masala.",
            "Add 100g crumbled paneer, stir continuously for 3 minutes.",
            "Serve with 3 puffed whole wheat rotis and fresh cucumber slices."
        ]
    },
    {
        "id": "lauki_chana_dal_roti",
        "name": "Bottle Gourd & Chana Dal Curry with Wheat Roti",
        "slot": "dinner",
        "diet_type": "veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "chana_black", "amount": 60},
            {"food_id": "lauki", "amount": 150},
            {"food_id": "wheat_atta", "amount": 70},
            {"food_id": "tomato", "amount": 40},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Pressure cook soaked chana and peeled cubed lauki with salt and haldi.",
            "Temper with tomatoes, cumin, and hing in 5ml mustard oil.",
            "Simmer for 5 minutes until flavors meld, serve with 2-3 rotis."
        ]
    },
    {
        "id": "egg_bhurji_rice_salad",
        "name": "Spiced Egg Bhurji (3 Eggs) with Steamed Rice & Salad",
        "slot": "dinner",
        "diet_type": "eggetarian",
        "prep_time_mins": 15,
        "ingredients": [
            {"food_id": "eggs", "amount": 3},
            {"food_id": "rice_white", "amount": 75},
            {"food_id": "cucumber", "amount": 70},
            {"food_id": "onion", "amount": 40},
            {"food_id": "tomato", "amount": 40},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Scramble 3 whole eggs with chopped onions, tomatoes, and spices in 5ml oil.",
            "Serve with freshly steamed white rice and crunchy cucumber salad."
        ]
    },
    {
        "id": "chicken_stirfry_sweet_potato",
        "name": "Chicken Breast & Broccoli Stir-Fry with Sweet Potato",
        "slot": "dinner",
        "diet_type": "non_veg",
        "prep_time_mins": 25,
        "ingredients": [
            {"food_id": "chicken_breast", "amount": 160},
            {"food_id": "sweet_potato", "amount": 150},
            {"food_id": "broccoli", "amount": 80},
            {"food_id": "carrot", "amount": 50},
            {"food_id": "mustard_oil", "amount": 5},
            {"food_id": "spices_basic", "amount": 5}
        ],
        "recipe_steps": [
            "Boil and cube sweet potatoes.",
            "Saute chicken breast strips in 5ml oil with garlic and black pepper for 6 minutes.",
            "Add broccoli florets, carrots, and sweet potato cubes; toss on high heat for 3 minutes.",
            "Serve warm."
        ]
    }
]

# Ensure Strict Calorie-Macro Identity on all dishes
for d in RAW_DISHES:
    total_p = 0.0
    total_c = 0.0
    total_f = 0.0
    total_fiber = 0.0
    total_cost = 0.0

    for ing in d["ingredients"]:
        fid = ing["food_id"]
        amt = ing["amount"]
        food = FOOD_MAP[fid]

        factor = amt / (1.0 if food["unit"] == "piece" else 100.0)
        total_p += food["protein_per_100"] * factor
        total_c += food["carbs_per_100"] * factor
        total_f += food["fats_per_100"] * factor
        total_fiber += food["fiber_per_100"] * factor
        total_cost += food["price_per_100g_or_unit_inr"] * factor

    d["protein_g"] = round(total_p, 1)
    d["carbs_g"] = round(total_c, 1)
    d["fats_g"] = round(total_f, 1)
    d["fiber_g"] = round(total_fiber, 1)
    # INVARIANT 2: calories = round((protein_g * 4) + (carbs_g * 4) + (fats_g * 9))
    d["calories"] = round((d["protein_g"] * 4) + (d["carbs_g"] * 4) + (d["fats_g"] * 9))
    d["cost_inr"] = round(total_cost, 2)
    name_encoded = urllib.parse.quote_plus(d["name"])
    d["video_recipe_url"] = f"https://www.youtube.com/results?search_query={name_encoded}+healthy+recipe"
    d["web_recipe_url"] = f"https://www.google.com/search?q={name_encoded}+easy+step+by+step+recipe"


# 50 Exercises (25 with_gym, 25 without_gym) with valid tutorial URLs
RAW_EXERCISES = [
    # --- WITHOUT GYM (HOME / BODYWEIGHT) ---
    {
        "id": "pushup_standard",
        "name": "Standard Floor Push-Up",
        "environment": "without_gym",
        "muscle_group": "chest",
        "sets": 3,
        "rep_range": "10-15",
        "rest_seconds": 60,
        "progression_cue": "Keep core tight without sagging hips. When you hit 15 clean reps, elevate feet on a chair.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+standard+push+up+tutorial"
    },
    {
        "id": "pushup_incline",
        "name": "Incline Push-Up (Hands on Bed/Table)",
        "environment": "without_gym",
        "muscle_group": "chest",
        "sets": 3,
        "rep_range": "12-15",
        "rest_seconds": 60,
        "progression_cue": "Great for beginners. Lower surface height as you gain strength until you can do floor push-ups.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+incline+push+up+tutorial"
    },
    {
        "id": "pushup_diamond",
        "name": "Diamond Push-Up",
        "environment": "without_gym",
        "muscle_group": "arms",
        "sets": 3,
        "rep_range": "8-12",
        "rest_seconds": 75,
        "progression_cue": "Place index fingers and thumbs together under chest. Emphasizes tricep lockout.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+diamond+push+up+tutorial"
    },
    {
        "id": "pushup_pike",
        "name": "Pike Push-Up",
        "environment": "without_gym",
        "muscle_group": "shoulders",
        "sets": 3,
        "rep_range": "8-12",
        "rest_seconds": 75,
        "progression_cue": "Hips high in downward dog shape. Lower forehead forward in a triangle path to build shoulder strength.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+pike+push+up+tutorial"
    },
    {
        "id": "chair_dips",
        "name": "Chair / Bench Dips",
        "environment": "without_gym",
        "muscle_group": "arms",
        "sets": 3,
        "rep_range": "10-15",
        "rest_seconds": 60,
        "progression_cue": "Keep back close to chair edge. Straighten legs forward or elevate feet on another chair to increase load.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+chair+bench+dips+tutorial"
    },
    {
        "id": "table_inverted_rows",
        "name": "Inverted Row Under Table",
        "environment": "without_gym",
        "muscle_group": "back",
        "sets": 3,
        "rep_range": "8-12",
        "rest_seconds": 75,
        "progression_cue": "Lie under a sturdy table, grip edge, pull chest up while maintaining straight rigid body line.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+table+inverted+row+tutorial"
    },
    {
        "id": "doorframe_towel_rows",
        "name": "Doorframe / Towel Pull Rows",
        "environment": "without_gym",
        "muscle_group": "back",
        "sets": 3,
        "rep_range": "12-15",
        "rest_seconds": 60,
        "progression_cue": "Wrap towel around sturdy door handle or pillar, lean back, pull chest towards anchor point squeezing scapulae.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+towel+door+row+tutorial"
    },
    {
        "id": "floor_superman_pulls",
        "name": "Prone Superman with Lat Pullback",
        "environment": "without_gym",
        "muscle_group": "back",
        "sets": 3,
        "rep_range": "12-15",
        "rest_seconds": 45,
        "progression_cue": "Lie face down, lift chest, drive elbows back towards waist, hold contraction for 2 seconds.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+superman+lat+pull+tutorial"
    },
    {
        "id": "backpack_bicep_curls",
        "name": "Loaded Backpack Bicep Curls",
        "environment": "without_gym",
        "muscle_group": "arms",
        "sets": 3,
        "rep_range": "10-14",
        "rest_seconds": 60,
        "progression_cue": "Fill backpack with textbooks/water bottles. Keep elbows pinned to ribs and squeeze biceps at top.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+backpack+bicep+curl+tutorial"
    },
    {
        "id": "backpack_overhead_press",
        "name": "Backpack Overhead Press",
        "environment": "without_gym",
        "muscle_group": "shoulders",
        "sets": 3,
        "rep_range": "10-12",
        "rest_seconds": 60,
        "progression_cue": "Press weighted backpack overhead into full elbow lockout, bracing abs without arching lower back.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+overhead+press+backpack+tutorial"
    },
    {
        "id": "bodyweight_squats",
        "name": "Air Squats (Tempo Controlled)",
        "environment": "without_gym",
        "muscle_group": "legs",
        "sets": 4,
        "rep_range": "15-20",
        "rest_seconds": 60,
        "progression_cue": "Feet shoulder-width, break at hips, sink below parallel. 3-second descent for max quad tension.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+bodyweight+air+squat+tutorial"
    },
    {
        "id": "bulgarian_split_squat_home",
        "name": "Bulgarian Split Squat (Back Foot on Bed/Chair)",
        "environment": "without_gym",
        "muscle_group": "legs",
        "sets": 3,
        "rep_range": "10-12",
        "rest_seconds": 75,
        "progression_cue": "Back foot on chair, lower rear knee toward floor. Hug a loaded backpack for progressive overload.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+bulgarian+split+squat+tutorial"
    },
    {
        "id": "walking_lunges_home",
        "name": "Walking Lunges (Living Room Laps)",
        "environment": "without_gym",
        "muscle_group": "legs",
        "sets": 3,
        "rep_range": "12-16 steps",
        "rest_seconds": 60,
        "progression_cue": "Step forward keeping front shin vertical. Lightly tap back knee to floor each stride.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+walking+lunges+tutorial"
    },
    {
        "id": "single_leg_glute_bridge",
        "name": "Single-Leg Glute Bridge",
        "environment": "without_gym",
        "muscle_group": "legs",
        "sets": 3,
        "rep_range": "12-15",
        "rest_seconds": 45,
        "progression_cue": "Drive heel into floor, extend hip until thigh and torso align, hold 2 seconds at top.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+single+leg+glute+bridge+tutorial"
    },
    {
        "id": "wall_sit",
        "name": "Wall Sit (Isometric Burn)",
        "environment": "without_gym",
        "muscle_group": "legs",
        "sets": 3,
        "rep_range": "45-60s hold",
        "rest_seconds": 60,
        "progression_cue": "Back flat against wall, knees at exactly 90 degrees. Add 5 seconds each week.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+wall+sit+tutorial"
    },
    {
        "id": "single_leg_calf_raises_home",
        "name": "Single-Leg Calf Raise on Stair Edge",
        "environment": "without_gym",
        "muscle_group": "legs",
        "sets": 3,
        "rep_range": "15-20",
        "rest_seconds": 45,
        "progression_cue": "Full deep stretch at bottom of step, push high onto big toe ball with a 1s pause.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+single+leg+calf+raise+tutorial"
    },
    {
        "id": "hollow_body_hold",
        "name": "Hollow Body Core Hold",
        "environment": "without_gym",
        "muscle_group": "core",
        "sets": 3,
        "rep_range": "30-45s hold",
        "rest_seconds": 45,
        "progression_cue": "Press lower back firmly into floor. Arms overhead, legs extended just above floor.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+hollow+body+hold+tutorial"
    },
    {
        "id": "lying_leg_raises",
        "name": "Lying Straight Leg Raises",
        "environment": "without_gym",
        "muscle_group": "core",
        "sets": 3,
        "rep_range": "12-15",
        "rest_seconds": 45,
        "progression_cue": "Control descent over 3 seconds. Stop heels 2 inches above floor without arching lower back.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+lying+leg+raises+tutorial"
    },
    {
        "id": "forearm_plank",
        "name": "Forearm Plank",
        "environment": "without_gym",
        "muscle_group": "core",
        "sets": 3,
        "rep_range": "45-60s hold",
        "rest_seconds": 45,
        "progression_cue": "Squeeze glutes and tuck pelvis slightly. Pull elbows toward toes isometrically.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+forearm+plank+tutorial"
    },
    {
        "id": "side_plank",
        "name": "Side Plank Oblique Hold",
        "environment": "without_gym",
        "muscle_group": "core",
        "sets": 3,
        "rep_range": "30-40s per side",
        "rest_seconds": 45,
        "progression_cue": "Elbow under shoulder, stack feet, drive hips high away from floor.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+side+plank+tutorial"
    },
    {
        "id": "mountain_climbers",
        "name": "Mountain Climbers (Core & Conditioning)",
        "environment": "without_gym",
        "muscle_group": "core",
        "sets": 3,
        "rep_range": "30-45s",
        "rest_seconds": 45,
        "progression_cue": "Maintain flat back plank position, drive knees alternate forward without bouncing hips.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+mountain+climbers+tutorial"
    },
    {
        "id": "burpees_bodyweight",
        "name": "Chest-to-Floor Burpees",
        "environment": "without_gym",
        "muscle_group": "full_body",
        "sets": 3,
        "rep_range": "10-15",
        "rest_seconds": 60,
        "progression_cue": "Drop chest to floor, snap feet forward under hips, jump vertically with hands clapping overhead.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+burpees+tutorial"
    },
    {
        "id": "doorframe_chin_ups",
        "name": "Pull-Up Bar / Doorframe Pull-Ups",
        "environment": "without_gym",
        "muscle_group": "back",
        "sets": 3,
        "rep_range": "6-10",
        "rest_seconds": 90,
        "progression_cue": "Full dead hang at bottom, pull chest to bar height with chin clearing bar.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+pull+up+tutorial"
    },
    {
        "id": "decline_pushup",
        "name": "Decline Push-Up (Feet on Chair)",
        "environment": "without_gym",
        "muscle_group": "chest",
        "sets": 3,
        "rep_range": "10-12",
        "rest_seconds": 60,
        "progression_cue": "Feet elevated on bed/chair, targets upper clavicular head of pectoral muscle.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+decline+push+up+tutorial"
    },
    {
        "id": "bench_tricep_dips",
        "name": "Parallel Dip (Two Sturdy Chairs)",
        "environment": "without_gym",
        "muscle_group": "arms",
        "sets": 3,
        "rep_range": "8-12",
        "rest_seconds": 75,
        "progression_cue": "Place two chairs side by side, support bodyweight on palms, bend knees and lower to 90 degrees.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+parallel+bar+dips+at+home+tutorial"
    },

    # --- WITH GYM ---
    {
        "id": "barbell_bench_press",
        "name": "Barbell Flat Bench Press",
        "environment": "with_gym",
        "muscle_group": "chest",
        "sets": 4,
        "rep_range": "8-10",
        "rest_seconds": 90,
        "progression_cue": "Retract scapulae, touch lower sternum with control, press up in a slight J-curve.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+barbell+bench+press+tutorial"
    },
    {
        "id": "incline_dumbbell_press",
        "name": "Incline Dumbbell Press (30 Degrees)",
        "environment": "with_gym",
        "muscle_group": "chest",
        "sets": 3,
        "rep_range": "8-12",
        "rest_seconds": 75,
        "progression_cue": "Keep elbows at 45-degree angle from torso to protect rotator cuffs while loading upper chest.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+incline+dumbbell+press+tutorial"
    },
    {
        "id": "cable_chest_fly",
        "name": "Standing Cable Chest Fly",
        "environment": "with_gym",
        "muscle_group": "chest",
        "sets": 3,
        "rep_range": "12-15",
        "rest_seconds": 60,
        "progression_cue": "Slight elbow bend, hug a barrel motion, squeeze pecs hard at peak contraction.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+cable+chest+fly+tutorial"
    },
    {
        "id": "lat_pulldown",
        "name": "Wide Grip Cable Lat Pulldown",
        "environment": "with_gym",
        "muscle_group": "back",
        "sets": 4,
        "rep_range": "8-12",
        "rest_seconds": 75,
        "progression_cue": "Drive elbows straight down toward hips without excessive backward swinging.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+lat+pulldown+tutorial"
    },
    {
        "id": "seated_cable_row",
        "name": "Seated Close-Grip Cable Row",
        "environment": "with_gym",
        "muscle_group": "back",
        "sets": 3,
        "rep_range": "10-12",
        "rest_seconds": 75,
        "progression_cue": "Chest tall, pull V-bar to belly button, squeeze shoulder blades together for 1 full second.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+seated+cable+row+tutorial"
    },
    {
        "id": "barbell_bent_over_row",
        "name": "Barbell Bent-Over Row",
        "environment": "with_gym",
        "muscle_group": "back",
        "sets": 4,
        "rep_range": "8-10",
        "rest_seconds": 90,
        "progression_cue": "Hinge at 45 degrees with flat spine. Pull bar to upper abdomen driving through elbows.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+barbell+bent+over+row+tutorial"
    },
    {
        "id": "barbell_back_squat",
        "name": "Barbell Back Squat",
        "environment": "with_gym",
        "muscle_group": "legs",
        "sets": 4,
        "rep_range": "6-10",
        "rest_seconds": 120,
        "progression_cue": "Brace core with Valsalva maneuver, break hips and knees simultaneously to depth below parallel.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+barbell+back+squat+tutorial"
    },
    {
        "id": "romanian_deadlift",
        "name": "Barbell / Dumbbell Romanian Deadlift (RDL)",
        "environment": "with_gym",
        "muscle_group": "legs",
        "sets": 4,
        "rep_range": "8-10",
        "rest_seconds": 90,
        "progression_cue": "Push hips back toward wall with soft knees, feel deep hamstring stretch, snap hips forward to lock out.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+romanian+deadlift+tutorial"
    },
    {
        "id": "leg_press_machine",
        "name": "45-Degree Leg Press",
        "environment": "with_gym",
        "muscle_group": "legs",
        "sets": 3,
        "rep_range": "10-12",
        "rest_seconds": 90,
        "progression_cue": "Do not lock knees at the top. Lower sled until knees reach 90 degrees without lower back rounding.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+leg+press+machine+tutorial"
    },
    {
        "id": "leg_extension_machine",
        "name": "Seated Quad Leg Extension",
        "environment": "with_gym",
        "muscle_group": "legs",
        "sets": 3,
        "rep_range": "12-15",
        "rest_seconds": 60,
        "progression_cue": "Pause at peak contraction for 1 second, control 3-second eccentric return.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+leg+extension+tutorial"
    },
    {
        "id": "lying_leg_curl_machine",
        "name": "Lying Hamstring Leg Curl",
        "environment": "with_gym",
        "muscle_group": "legs",
        "sets": 3,
        "rep_range": "10-12",
        "rest_seconds": 60,
        "progression_cue": "Keep hips pinned to pad, curl heels all the way to glutes, resist the weight going down.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+lying+leg+curl+tutorial"
    },
    {
        "id": "standing_calf_raise_machine",
        "name": "Standing Machine Calf Raise",
        "environment": "with_gym",
        "muscle_group": "legs",
        "sets": 4,
        "rep_range": "12-15",
        "rest_seconds": 60,
        "progression_cue": "Deep bottom stretch for 2 seconds to eliminate Achilles tendon elastic rebound.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+standing+calf+raise+tutorial"
    },
    {
        "id": "standing_overhead_barbell_press",
        "name": "Standing Barbell Overhead Press (OHP)",
        "environment": "with_gym",
        "muscle_group": "shoulders",
        "sets": 4,
        "rep_range": "6-8",
        "rest_seconds": 90,
        "progression_cue": "Squeeze glutes and quads. Clear chin, press straight vertical, lock out with head through window.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+overhead+press+tutorial"
    },
    {
        "id": "dumbbell_lateral_raise",
        "name": "Dumbbell Lateral Raise",
        "environment": "with_gym",
        "muscle_group": "shoulders",
        "sets": 4,
        "rep_range": "12-15",
        "rest_seconds": 60,
        "progression_cue": "Lead with elbows in the scapular plane (30 degrees forward of midline), avoid shrugging traps.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+dumbbell+lateral+raise+tutorial"
    },
    {
        "id": "face_pull_cable",
        "name": "Rope Cable Face Pulls",
        "environment": "with_gym",
        "muscle_group": "shoulders",
        "sets": 4,
        "rep_range": "15-20",
        "rest_seconds": 60,
        "progression_cue": "Pull rope to bridge of nose while externally rotating hands so thumbs point backward.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+face+pulls+tutorial"
    },
    {
        "id": "barbell_bicep_curl",
        "name": "Barbell / EZ-Bar Bicep Curl",
        "environment": "with_gym",
        "muscle_group": "arms",
        "sets": 3,
        "rep_range": "8-12",
        "rest_seconds": 60,
        "progression_cue": "Pin elbows to your ribs. No momentum or lower back swing. Full curl and extension.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+bicep+curl+tutorial"
    },
    {
        "id": "incline_dumbbell_curl",
        "name": "Incline Bench Dumbbell Curl",
        "environment": "with_gym",
        "muscle_group": "arms",
        "sets": 3,
        "rep_range": "10-12",
        "rest_seconds": 60,
        "progression_cue": "Bench at 45-60 degrees. Puts biceps into full stretch position for maximum long-head growth.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+incline+dumbbell+curl+tutorial"
    },
    {
        "id": "tricep_rope_pushdown",
        "name": "Tricep Cable Rope Pushdown",
        "environment": "with_gym",
        "muscle_group": "arms",
        "sets": 3,
        "rep_range": "10-14",
        "rest_seconds": 60,
        "progression_cue": "Spread rope tips apart at bottom lockout, flexing triceps hard for 1 second.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+tricep+pushdown+tutorial"
    },
    {
        "id": "skull_crushers_ez_bar",
        "name": "Lying EZ-Bar Skull Crushers",
        "environment": "with_gym",
        "muscle_group": "arms",
        "sets": 3,
        "rep_range": "10-12",
        "rest_seconds": 75,
        "progression_cue": "Lower bar behind crown of head to keep tension continuous on tricep long head.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+skull+crushers+tutorial"
    },
    {
        "id": "hanging_leg_raises_gym",
        "name": "Hanging Captain's Chair / Bar Leg Raise",
        "environment": "with_gym",
        "muscle_group": "core",
        "sets": 3,
        "rep_range": "10-15",
        "rest_seconds": 60,
        "progression_cue": "Roll pelvis up toward ribcage at top rather than just swinging legs.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+hanging+leg+raise+tutorial"
    },
    {
        "id": "cable_woodchopper",
        "name": "Cable Diagonal Woodchopper",
        "environment": "with_gym",
        "muscle_group": "core",
        "sets": 3,
        "rep_range": "12-15 per side",
        "rest_seconds": 45,
        "progression_cue": "Rotate through thoracic spine and hips, keeping arms straight to load obliques.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+cable+woodchopper+tutorial"
    },
    {
        "id": "deadlift_conventional",
        "name": "Conventional Barbell Deadlift",
        "environment": "with_gym",
        "muscle_group": "back",
        "sets": 3,
        "rep_range": "5-6",
        "rest_seconds": 150,
        "progression_cue": "Bar over midfoot, pull slack out of bar, drive floor away with legs maintaining neutral spine.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+conventional+deadlift+tutorial"
    },
    {
        "id": "dumbbell_shrugs",
        "name": "Heavy Dumbbell Shrugs",
        "environment": "with_gym",
        "muscle_group": "back",
        "sets": 3,
        "rep_range": "12-15",
        "rest_seconds": 60,
        "progression_cue": "Shrug straight up toward ears, hold peak squeeze for 2 seconds. Do not roll shoulders.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+dumbbell+shrugs+tutorial"
    },
    {
        "id": "pec_deck_fly",
        "name": "Pec Deck Machine Fly",
        "environment": "with_gym",
        "muscle_group": "chest",
        "sets": 3,
        "rep_range": "12-15",
        "rest_seconds": 60,
        "progression_cue": "Keep chest puffed and shoulders back against pad. Squeeze elbows together.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+pec+deck+machine+fly+tutorial"
    },
    {
        "id": "hammer_curls_dumbbell",
        "name": "Standing Neutral Grip Hammer Curls",
        "environment": "with_gym",
        "muscle_group": "arms",
        "sets": 3,
        "rep_range": "10-12",
        "rest_seconds": 60,
        "progression_cue": "Palms facing each other throughout. Builds the brachialis and forearm thickness.",
        "tutorial_url": "https://www.youtube.com/results?search_query=proper+form+hammer+curls+tutorial"
    }
]

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, "data")
    os.makedirs(data_dir, exist_ok=True)

    # 1. Validate & Save foods.json
    foods_path = os.path.join(data_dir, "foods.json")
    print(f"Validating {len(RAW_FOODS)} foods...")
    for f in RAW_FOODS:
        calc_cals = round((f["protein_per_100"] * 4) + (f["carbs_per_100"] * 4) + (f["fats_per_100"] * 9))
        assert f["calories_per_100"] == calc_cals, f"Calorie identity failed on food {f['id']}: {f['calories_per_100']} != {calc_cals}"
        assert f["category"] in ["vegetable", "fruit", "protein", "grain", "dairy_fat"]
        assert all(t in ["veg", "egg", "non_veg"] for t in f["diet_tags"])
        assert f["unit"] in ["g", "piece", "ml"]
        assert f["budget_tier"] in ["essential", "mid", "premium"]
        assert f["price_per_100g_or_unit_inr"] > 0

    with open(foods_path, "w", encoding="utf-8") as fp:
        json.dump(RAW_FOODS, fp, indent=2)
    print(f"[OK] Saved {len(RAW_FOODS)} foods to {foods_path}")

    # 2. Validate & Save dishes.json
    dishes_path = os.path.join(data_dir, "dishes.json")
    print(f"Validating {len(RAW_DISHES)} dishes...")
    for d in RAW_DISHES:
        assert d["slot"] in ["breakfast", "lunch", "snack", "dinner"]
        assert d["diet_type"] in ["veg", "eggetarian", "non_veg"]
        assert len(d["ingredients"]) > 0
        assert len(d["recipe_steps"]) > 0

        # Verify all ingredients exist
        for ing in d["ingredients"]:
            fid = ing["food_id"]
            assert fid in FOOD_MAP, f"Dish {d['id']} references unknown food {fid}"
            assert ing["amount"] > 0, f"Dish {d['id']} has invalid amount for {fid}"

        # Invariant 2 check on dish macros
        expected_cals = round((d["protein_g"] * 4) + (d["carbs_g"] * 4) + (d["fats_g"] * 9))
        assert d["calories"] == expected_cals, f"Calorie identity failed on dish {d['id']}: {d['calories']} != {expected_cals}"

    with open(dishes_path, "w", encoding="utf-8") as fp:
        json.dump(RAW_DISHES, fp, indent=2)
    print(f"[OK] Saved {len(RAW_DISHES)} dishes to {dishes_path}")

    # 3. Validate & Save exercises.json
    exercises_path = os.path.join(data_dir, "exercises.json")
    print(f"Validating {len(RAW_EXERCISES)} exercises...")
    without_gym_count = 0
    with_gym_count = 0

    for ex in RAW_EXERCISES:
        assert ex["environment"] in ["with_gym", "without_gym"]
        if ex["environment"] == "with_gym":
            with_gym_count += 1
        else:
            without_gym_count += 1

        assert ex["muscle_group"] in ["chest", "back", "legs", "shoulders", "arms", "core", "full_body"]
        assert ex["sets"] > 0
        assert len(ex["rep_range"]) > 0
        assert ex["rest_seconds"] > 0
        assert len(ex["progression_cue"]) > 0
        # Invariant: tutorial_url must be a non-empty, valid YouTube URL
        assert ex["tutorial_url"].startswith("https://www.youtube.com/"), f"Exercise {ex['id']} has invalid url: {ex['tutorial_url']}"

    assert with_gym_count >= 20, f"Need at least 20 gym exercises, got {with_gym_count}"
    assert without_gym_count >= 20, f"Need at least 20 home exercises, got {without_gym_count}"

    with open(exercises_path, "w", encoding="utf-8") as fp:
        json.dump(RAW_EXERCISES, fp, indent=2)
    print(f"[OK] Saved {len(RAW_EXERCISES)} exercises ({with_gym_count} gym, {without_gym_count} home) to {exercises_path}")

    print("\n=== ALL GROUND-TRUTH DATASETS VALIDATED 100% SUCCESSFULLY! ===")

if __name__ == "__main__":
    main()
