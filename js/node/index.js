import { updateDIDsNode } from './update-dids-node';
import { updateIndexNode } from './update-index-node';

export function runNode() {
  const updateIndex = process.argv.some(arg => /update[^a-zA-Z]*index/i.test(arg));
  if (updateIndex) return updateIndexNode();
  else return updateDIDsNode();
}