import 'dotenv/config';
import argon2 from 'argon2';
import { database,ensureIndexes } from './db.js';
import { USERS } from './models/user.model.js';

const email=process.env.ADMIN_EMAIL?.trim().toLowerCase(),password=process.env.ADMIN_PASSWORD,name=process.env.ADMIN_NAME?.trim()||'Global Administrator';
if(!email||!password||password.length<16){console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 16 characters) in environment variables.');process.exit(1)}
const db=await database();await ensureIndexes(db);
if(await db.collection(USERS).countDocuments({role:'GLOBAL_ADMIN'})){console.error('A global admin already exists; no changes made.');process.exit(1)}
await db.collection(USERS).insertOne({tenantId:null,email,name,passwordHash:await argon2.hash(password),role:'GLOBAL_ADMIN',active:true,createdAt:new Date()});
console.log('Global administrator created. Remove ADMIN_PASSWORD from your shell environment.');process.exit(0);
