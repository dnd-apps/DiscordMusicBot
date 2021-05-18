import dotenv from 'dotenv';
dotenv.config();

export const token = process.env.TOKEN || '';
export const prefix = process.env.PREFIX || '-';
export const permissions = parseInt(process.env.PERMISSIONS || '3214400');
