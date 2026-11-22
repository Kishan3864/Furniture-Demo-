import core from './hi-core';
import orders from './hi-orders';
import business from './hi-business';
import admin from './hi-admin';

/** Merged English -> Hinglish dictionary. */
export const HI: Record<string, string> = { ...core, ...orders, ...business, ...admin };
