import pino from 'pino';

export const logger = pino();

export const main = logger.child({ namespace: 'main' });
export const queue = logger.child({ namespace: 'queue' });
