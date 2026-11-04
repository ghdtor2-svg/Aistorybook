'use client';
import {useState} from 'react';import {storageSnapshot} from '../lib/storage-snapshot';
export default function StorageRescue({keys,label}:{keys:readonly string[];label:string}){
 const [error,setError]=useState('');
 function download(){setError('');try{const raw=storageSnapshot(localStorage,keys);const url=URL.createObjectURL(new Blob([raw],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='ai-office-storage-original.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){setError(e instanceof Error?e.message:'저장 원문을 읽지 못했습니다.');}}
 return <aside className="notice" style={{margin:'16px 0'}}><p>읽지 못한 저장 내용을 원문 파일로 보관할 수 있습니다. 형식이 손상된 내용도 그대로 포함합니다. 이 파일은 원문 확인용이며 일반 백업 복원 화면에서는 사용할 수 없습니다.</p><p className="muted">브라우저에 실제 저장된 값만 포함합니다. 저장에 실패한 화면의 최신 수정본은 별도로 내려받아 보관하세요.</p><button className="secondary" onClick={download}>{label}</button>{error&&<p role="alert">{error}</p>}</aside>;
}
