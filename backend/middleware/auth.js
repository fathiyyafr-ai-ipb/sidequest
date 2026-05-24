const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Tidak ada token, otorisasi ditolak' });
  }

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'secret_key_sidequest');
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token tidak valid' });
  }
};

module.exports = authMiddleware;
