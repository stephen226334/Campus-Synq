const mongoose = require('mongoose');
const TimetableEntry = require('../models/TimetableEntry');
const Substitution = require('../models/Substitution');

(async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/campus_synq');
    
    // Find all substitutions and their referenced timetableEntry IDs
    const subs = await Substitution.find().lean();
    const referencedIds = new Set(subs.map(s => s.timetableEntry?.toString()).filter(Boolean));
    console.log('Referenced IDs in substitutions:', Array.from(referencedIds));
    
    const entries = await TimetableEntry.find({ status: 'ACTIVE' }).lean();
    console.log('Total active entries before cleanup:', entries.length);
    
    const groups = new Map();
    for (const e of entries) {
      // Unique session definition: day + period + section + subject + room
      const key = [
        e.day,
        e.period?.toString(),
        e.section?.toString(),
        e.subject?.toString(),
        e.roomId?.toString() || e.roomDetails?.roomNumber
      ].join('|');
      
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    
    let toDeleteIds = [];
    let keptCount = 0;
    
    for (const [key, list] of groups.entries()) {
      if (list.length === 1) {
        keptCount++;
        continue;
      }
      
      // Sort to prioritize one referenced in substitutions, else earliest _id
      list.sort((a, b) => {
        const aRef = referencedIds.has(a._id.toString()) ? 1 : 0;
        const bRef = referencedIds.has(b._id.toString()) ? 1 : 0;
        if (bRef !== aRef) return bRef - aRef; // referenced first
        return a._id.getTimestamp() - b._id.getTimestamp(); // earliest first
      });
      
      const keeper = list[0];
      keptCount++;
      const duplicates = list.slice(1);
      toDeleteIds.push(...duplicates.map(d => d._id));
    }
    
    console.log('Unique sessions kept:', keptCount);
    console.log('Duplicate records to delete:', toDeleteIds.length);
    
    if (toDeleteIds.length > 0) {
      const res = await TimetableEntry.deleteMany({ _id: { $in: toDeleteIds } });
      console.log('Deleted count:', res.deletedCount);
    }
    
    const remaining = await TimetableEntry.countDocuments({ status: 'ACTIVE' });
    console.log('Total active entries after cleanup:', remaining);
  } catch (err) {
    console.error('Dedup error:', err);
  } finally {
    await mongoose.disconnect();
  }
})();
