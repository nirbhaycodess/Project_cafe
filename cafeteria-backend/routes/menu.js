// File path: cafeteria-backend/routes/menu.js
const express = require('express');
const MenuItem = require('../models/menuitems');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/menu - Public / All logged-in users
router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu items.' });
  }
});

// POST /api/menu - Create menu item (Manager & SuperAdmin)
router.post('/', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, isAvailable, stock, isQuickItem } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ message: 'Name, price, and category are required.' });
    }

    const newItem = new MenuItem({
      name: name.trim(),
      description: description ? description.trim() : '',
      price: Number(price),
      category: category.trim(),
      imageUrl: imageUrl || '',
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      stock: stock !== undefined ? Number(stock) : -1,
      isQuickItem: Boolean(isQuickItem),
    });

    const savedItem = await newItem.save();
    res.status(201).json({ message: 'Menu item created.', item: savedItem });
  } catch (error) {
    console.error('Create Menu Error:', error);
    res.status(500).json({ message: 'Failed to create menu item.' });
  }
});

// PUT /api/menu/:id - Update menu item (Manager & SuperAdmin)
router.put('/:id', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }
    res.status(200).json({ message: 'Menu item updated.', item: updatedItem });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update menu item.' });
  }
});

// DELETE /api/menu/:id - Delete menu item (Manager & SuperAdmin)
router.delete('/:id', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const deleted = await MenuItem.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }
    res.status(200).json({ message: 'Menu item deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete menu item.' });
  }
});

module.exports = router;