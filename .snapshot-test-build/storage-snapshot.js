"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageSnapshot = storageSnapshot;
const allowed = new Set(['ai-office:storybook:v1', 'ai-office:books:v1', 'ai-office:story-request:v1', 'ai-office:workspace:v1']);
function storageSnapshot(storage, keys) {
    const unique = [...new Set(keys)];
    if (!unique.length || unique.some(key => !allowed.has(key) && !(key.startsWith('ai-office:chat:') && key.length <= 300)))
        throw Error('이 앱의 작업 저장 원문만 보관할 수 있습니다.');
    const entries = unique.map(key => ({ key, raw: storage.getItem(key) }));
    if (entries.every(entry => entry.raw === null))
        throw Error('보관할 저장 원문이 없습니다.');
    if (entries.reduce((sum, entry) => sum + (entry.raw?.length || 0), 0) > 10000000)
        throw Error('저장 원문이 너무 큽니다.');
    return JSON.stringify({ format: 'ai-office-storage-snapshot', version: 1, exportedAt: new Date().toISOString(), entries }, null, 2);
}
