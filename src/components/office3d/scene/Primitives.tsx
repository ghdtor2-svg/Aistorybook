import { RoundedBox } from "@react-three/drei";
export type Vec3 = [number, number, number];
export function Box({
  p,
  s,
  c,
  r = 0.04,
}: {
  p: Vec3;
  s: Vec3;
  c: string;
  r?: number;
}) {
  return (
    <RoundedBox
      position={p}
      args={s}
      radius={r}
      smoothness={2}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={c} roughness={0.85} />
    </RoundedBox>
  );
}
export function Ball({
  p = [0, 0, 0],
  s = [1, 1, 1],
  c,
  rotation = [0, 0, 0],
}: {
  p?: Vec3;
  s?: Vec3;
  c: string;
  rotation?: Vec3;
}) {
  return (
    <mesh position={p} scale={s} rotation={rotation} castShadow receiveShadow>
      <sphereGeometry args={[1, 20, 16]} />
      <meshStandardMaterial color={c} roughness={0.8} />
    </mesh>
  );
}
export function Stem({
  p,
  h = 0.6,
  r = 0.04,
  c = "#8b7654",
  rotation = [0, 0, 0],
}: {
  p: Vec3;
  h?: number;
  r?: number;
  c?: string;
  rotation?: Vec3;
}) {
  return (
    <mesh position={p} rotation={rotation} castShadow>
      <cylinderGeometry args={[r * 0.7, r, h, 10]} />
      <meshStandardMaterial color={c} />
    </mesh>
  );
}
