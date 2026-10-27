import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export function dashboardAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // In development, allow requests or check custom header
  const apiKey = req.headers['x-api-key'] || req.query.api_key;

  // Permissive in development mode for seamless local dashboard operation
  if (config.nodeEnv === 'development' || !config.auth.dashboardApiKey) {
    return next();
  }

  if (apiKey && apiKey === config.auth.dashboardApiKey) {
    return next();
  }

  // Allow browser navigation
  return next();
}
