// File path: cafeteria-backend/routes/menu.js
const express = require('express');
const MenuItem = require('../models/menuitems');
const { verifyToken, verifyRole } = require('../middleware/authMiddleware');

const router = express.Router();

// POST: Add a new menu item (Manager & SuperAdmin only)
router.post('/', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const { name, description, price, category, isAvailable, stock } = req.body;
    const newItem = new MenuItem({ name, description, price, category, isAvailable, stock });
    const savedItem = await newItem.save();
    res.status(201).json({ message: 'Menu item created successfully.', item: savedItem });
  } catch (error) {
    console.error('Add Menu Item Error:', error);
    res.status(500).json({ message: 'Failed to create menu item.' });
  }
});

// GET: Retrieve all menu items (Accessible by any logged-in user)
router.get('/', verifyToken, async (req, res) => {
  try {
    const items = await MenuItem.find();
    res.status(200).json(items);
  } catch (error) {
    console.error('Fetch Menu Items Error:', error);
    res.status(500).json({ message: 'Failed to fetch menu items.' });
  }
});

// PUT: Update an existing menu item (Manager & SuperAdmin only)
router.put('/:id', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    // findByIdAndUpdate takes the ID, the new data, and { new: true } to return the updated document
    const updatedItem = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    if (!updatedItem) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }
    
    res.status(200).json({ message: 'Menu item updated successfully.', item: updatedItem });
  } catch (error) {
    console.error('Update Menu Item Error:', error);
    res.status(500).json({ message: 'Failed to update menu item.' });
  }
});

// DELETE: Remove a menu item (Manager & SuperAdmin only)
router.delete('/:id', verifyToken, verifyRole(['Manager', 'SuperAdmin']), async (req, res) => {
  try {
    const deletedItem = await MenuItem.findByIdAndDelete(req.params.id);
    
    if (!deletedItem) {
      return res.status(404).json({ message: 'Menu item not found.' });
    }
    
    res.status(200).json({ message: 'Menu item deleted successfully.' });
  } catch (error) {
    console.error('Delete Menu Item Error:', error);
    res.status(500).json({ message: 'Failed to delete menu item.' });
  }
});

module.exports = router;