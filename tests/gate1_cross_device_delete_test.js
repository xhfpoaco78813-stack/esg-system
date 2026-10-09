function emptyState(reset = 0) {
  return {cloud_reset_version:reset,answered:{},past37:{answers:{}}};
}

class Backend {
  constructor() { this.reset = 0; this.progress = emptyState(); this.draft = null; }
  merge(client) {
    if ((client.cloud_reset_version || 0) < this.reset) return emptyState(this.reset);
    this.progress = {
      cloud_reset_version:this.reset,
      answered:{...this.progress.answered,...client.answered},
      past37:{answers:{...this.progress.past37.answers,...client.past37.answers}}
    };
    return structuredClone(this.progress);
  }
  syncDraft(clientReset, draft) {
    if (clientReset < this.reset) return {deleted:true,cloudResetVersion:this.reset};
    this.draft = draft;
    return draft;
  }
  deleteAll() { this.reset++; this.progress = emptyState(this.reset); this.draft = null; return this.reset; }
}

const backend = new Backend();
let deviceA = {cloud_reset_version:0,answered:{A1:{correct:true}},past37:{answers:{PE22:{correct:true}}}};
let deviceB = {cloud_reset_version:0,answered:{B1:{correct:false}},past37:{answers:{PE23:{correct:false}}}};
deviceA = backend.merge(deviceA);
deviceB = backend.merge(deviceB);
if (Object.keys(backend.progress.answered).length !== 2) throw Error('initial A/B merge failed');
backend.syncDraft(0,{ids:['Q1'],savedAt:1});

const reset = backend.deleteAll();
deviceA = emptyState(reset);
deviceB = backend.merge(deviceB); // B reconnects with stale reset version 0.
if (Object.keys(deviceB.answered).length || Object.keys(backend.progress.answered).length) throw Error('B resurrected deleted progress');
const staleDraft = backend.syncDraft(0,{ids:['OLD'],savedAt:2});
if (!staleDraft.deleted || backend.draft !== null) throw Error('B resurrected deleted draft');

deviceA.answered.NEW = {correct:true};
deviceA = backend.merge(deviceA);
if (!backend.progress.answered.NEW || backend.progress.answered.A1) throw Error('new generation data handling failed');

console.log('PASS  A and B initially merge at reset generation 0');
console.log('PASS  cloud delete advances the account reset generation');
console.log('PASS  stale B progress is cleared and cannot resurrect deleted data');
console.log('PASS  stale B exam draft is rejected');
console.log('PASS  new post-delete data at the current generation can sync');
