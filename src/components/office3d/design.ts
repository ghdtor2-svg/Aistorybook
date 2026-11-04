export type AgentStatus = "idle" | "working" | "done" | "error";
export type Season = "spring" | "summer" | "autumn" | "winter";
export const seasons: Record<
  Season,
  { label: string; accent: string; floor: string; light: string }
> = {
  spring: {
    label: "봄",
    accent: "#cf8ea5",
    floor: "#dbe5ce",
    light: "#f6e7ed",
  },
  summer: {
    label: "여름",
    accent: "#c49c48",
    floor: "#f1dfae",
    light: "#fff3ce",
  },
  autumn: {
    label: "가을",
    accent: "#c58a60",
    floor: "#e8cdb1",
    light: "#faeadd",
  },
  winter: {
    label: "겨울",
    accent: "#7da8c2",
    floor: "#c9e0eb",
    light: "#e8f4f8",
  },
};
export interface OfficeAgent {
  season: Season;
  id: string;
  name: string;
  role: string;
  specialty: string;
  task: string;
  status: AgentStatus;
  progress: number;
  color: string;
  initials: string;
  position: [number, number, number];
}
export const statuses: Record<AgentStatus, { label: string; color: string }> = {
  idle: { label: "대기 중", color: "#a8a29e" },
  working: { label: "작업 중", color: "#5f8d71" },
  done: { label: "완료", color: "#7299bb" },
  error: { label: "확인 필요", color: "#d87a65" },
};
export const initialAgents: OfficeAgent[] = [
  {
    id: "dev",
    season: "winter",
    name: "눈송이",
    role: "개발자",
    specialty: "코드 개발 · 시스템 구축",
    task: "대시보드 API 연동 구조 설계",
    status: "working",
    progress: 68,
    color: "#7da8c2",
    initials: "눈",
    position: [-3, 0, -1.8],
  },
  {
    id: "planner",
    season: "spring",
    name: "꽃잎이",
    role: "기획자",
    specialty: "프로젝트 기획 · 업무 설계",
    task: "다음 스프린트 요구사항 정리",
    status: "working",
    progress: 42,
    color: "#cf8ea5",
    initials: "꽃",
    position: [2.7, 0, -1.8],
  },
  {
    id: "design",
    season: "summer",
    name: "햇님이",
    role: "품질관리·디자인",
    specialty: "QA · UI/UX 디자인 · 검수",
    task: "온보딩 화면 디자인 검수",
    status: "done",
    progress: 100,
    color: "#c49c48",
    initials: "햇",
    position: [-3, 0, 2.2],
  },
  {
    id: "marketing",
    season: "autumn",
    name: "낙엽이",
    role: "마케팅",
    specialty: "콘텐츠 제작 · 광고 · 홍보",
    task: "신규 캠페인 브리프 기다리는 중",
    status: "idle",
    progress: 0,
    color: "#c58a60",
    initials: "낙",
    position: [2.7, 0, 2.2],
  },
];
