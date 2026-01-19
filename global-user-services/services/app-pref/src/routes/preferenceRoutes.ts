import express from 'express';
import {
  createPreference,
  getPreferences,
  updatePreference,
  deletePreference,
} from '../controllers/preferenceController';

const router = express.Router();

const isLocaleFormat = (str: string) => /^[a-z]{2}-[A-Z]{2}$/.test(str); 

router.get('/:brandId/:locale', getPreferences); 

router.get('/:param', (req, res) => { 
  const param = req.params.param;
  
  if (isLocaleFormat(param)) {
    return res.status(400).json({
      statusCode: 400,
      message: "Brand ID is required",
      error: "Missing Brand ID",
    });
  }

  return res.status(400).json({
    statusCode: 400,
    message: "Locale is required",
    error: "Missing Locale",
  });
});

router.get('/', (req, res) => { 
  res.status(400).json({
    statusCode: 400,
    message: "Brand ID and Locale are required",
    error: "Missing parameters",
  });
});

router.post('/', createPreference); 
router.put('/', updatePreference); 

router.delete('/:brandId/:locale', deletePreference); 

router.delete('/:param', (req, res) => { 
  const param = req.params.param;
  
  if (isLocaleFormat(param)) {
    return res.status(400).json({
      statusCode: 400,
      message: "Brand ID is required",
      error: "Missing Brand ID",
    });
  }

  return res.status(400).json({
    statusCode: 400,
    message: "Locale is required",
    error: "Missing Locale",
  });
});

router.delete('/', (req, res) => { 
  res.status(400).json({
    statusCode: 400,
    message: "Brand ID and Locale are required",
    error: "Missing parameters",
  });
});

export default router;