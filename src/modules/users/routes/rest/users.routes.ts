// modules/users/routes/rest/users.routes.ts
import { Router } from 'express';
import { UsersService } from '../../services/users.service';
// Import loginRateLimiter middleware
import { loginRateLimiter } from '../../../../middleware/rate-limit';

const router = Router();
const service = new UsersService();

// User login
router.post('/auth/login', loginRateLimiter, async (req, res) => {
  try {
    const user = await service.login(req.body);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});

// User registration
router.post('/auth/register', loginRateLimiter, async (req, res) => {
  try {
    const user = await service.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Refresh token
router.post('/auth/refresh-token', async (req, res) => {
  try {
    const user = await service.refreshToken(req.body.token);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});

// User forgot password
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const user = await service.forgotPassword(req.body.email);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

// Reset password
router.post('/auth/reset-password', async (req, res) => {
  try {
    const user = await service.resetPassword(req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;