import { optionsFor, request, save } from './common.js';
export const options=optionsFor('ramp-up');
export default function() { request(false); }
export const handleSummary=save;
