import {useEffect,useRef} from 'react';
import styles from './GenerationWait.module.css';

type Props=({kind:'text';seconds:number;phase:string}|{kind:'art';done:number;total:number})&{onClose?:()=>void};
export default function GenerationWait(props:Props){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=dialog.current;node?.showModal();return ()=>node?.close();},[]);
 const text=props.kind==='text';
 const percent=text?Math.min(95,Math.floor(props.seconds/120*100)):Math.floor(props.done/Math.max(1,props.total)*100);
 const detail=text?(props.seconds<120?'예상 남은 시간 약 '+Math.max(1,60-props.seconds)+'~'+(120-props.seconds)+'초':'평소보다 오래 걸리고 있어요'):('전체 '+props.total+'장 중 '+props.done+'장 완성');
 return <dialog ref={dialog} className={styles.screen} aria-labelledby="wait-title" onCancel={()=>props.onClose?.()}>
  <div className={styles.card}>
   <img className={text?styles.baker:styles.tower} src={text?'/storybook/styles/soft-clay.webp':'/storybook/sample/cover.webp'} alt={text?'별 모양 쿠키를 만드는 작은 용':'사계의 탑 앞에 모인 네 계절 친구들'}/>
   <section className={styles.copy}>
    <small>{text?'동화 본문':'표지와 삽화'}</small>
    <h2 id="wait-title">{text?'동화를 쓰고 있어요':'그림을 그리고 있어요'}</h2>
    <p>{text?(props.phase.includes('앞뒤 연결')?'이야기의 흐름과 문장을 다듬고 있어요.':props.phase.includes('기다리고')?'글쓰기를 시작할 차례를 기다리고 있어요.':'들려주신 추억을 이야기로 엮고 있어요.'):'사계의 탑 친구들과 다음 장면을 기다려요.'}</p>
    <div className={styles.row}><span>{text?'예상 진행률':'완성된 그림'}</span><strong>{percent}%</strong></div>
    <progress max={100} value={percent} aria-label={text?'본문 예상 진행률':'삽화 완성률'}/>
    <p className={styles.detail}>{detail}</p>
    {props.onClose&&<button type="button" onClick={props.onClose}>대기 화면 닫기</button>}
   </section>
  </div>
 </dialog>;
}
