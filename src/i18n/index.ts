import core from './hi-core';
import orders from './hi-orders';
import business from './hi-business';
import admin from './hi-admin';
import board from './hi-board';
import tour from './hi-tour';

/** Merged English -> Hinglish dictionary. */
export const HI: Record<string, string> = { ...core, ...orders, ...business, ...admin, ...board, ...tour };
