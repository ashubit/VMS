import { ObjectId } from 'mongodb';

export function toObjectId(value) {
  return ObjectId.isValid(value) && String(new ObjectId(value)) === value.toLowerCase() ? new ObjectId(value) : null;
}
