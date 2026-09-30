import { MongoClient } from 'mongodb';
import { env } from './config/env.js';
import { AUDIT_EVENTS } from './models/audit.model.js';
import { KIOSKS } from './models/kiosk.model.js';
import { QR_PASSES } from './models/qr-pass.model.js';
import { SESSIONS } from './models/session.model.js';
import { TENANTS } from './models/tenant.model.js';
import { TENANT_SETTINGS } from './models/settings.model.js';
import { USERS } from './models/user.model.js';
import { VISITS } from './models/visit.model.js';

let promise;
export async function database(){
 if(!promise){
  const uri=env.mongoUri;
  if(!uri)throw new Error('MONGODB_URI is required');
  const client=new MongoClient(uri,{maxPoolSize:10});
  promise=client.connect().then(()=>client.db(env.mongoDbName)).catch(e=>{promise=undefined;throw e});
 }
 return promise;
}
export async function ensureIndexes(db){
 await Promise.all([
  db.collection(USERS).createIndex({email:1},{unique:true}),
  db.collection(USERS).createIndex({tenantId:1,role:1}),
  db.collection(SESSIONS).createIndex({expiresAt:1},{expireAfterSeconds:0}),
  db.collection(VISITS).createIndex({tenantId:1,expectedAt:-1}),
  db.collection(VISITS).createIndex({tenantId:1,hostId:1,expectedAt:-1}),
  db.collection(VISITS).createIndex({tenantId:1,status:1,expectedAt:-1}),
  db.collection(VISITS).createIndex({passTokenHash:1},{unique:true,sparse:true}),
  db.collection(QR_PASSES).createIndex({tokenHash:1},{unique:true}),
  db.collection(QR_PASSES).createIndex({tenantId:1,issuedAt:-1}),
  db.collection(QR_PASSES).createIndex({visitId:1,issuedAt:-1}),
  db.collection(TENANTS).createIndex({name:1},{unique:true}),
  db.collection(TENANT_SETTINGS).createIndex({tenantId:1},{unique:true}),
  db.collection(KIOSKS).createIndex({tenantId:1,active:1}),
  db.collection(AUDIT_EVENTS).createIndex({tenantId:1,createdAt:-1}),
  db.collection(AUDIT_EVENTS).createIndex({createdAt:-1})
 ]);
}
