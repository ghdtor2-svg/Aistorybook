"use client";
import { Canvas, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import { CanvasTexture, SRGBColorSpace, OrthographicCamera } from "three";
import { OfficeAgent, statuses, seasons } from "./design";
import { Box } from "./scene/Primitives";
import Mascot from "./scene/Mascot";
import {
  SeasonalTree,
  SeasonPatch,
  DeskDecor,
  MeetingGarden,
} from "./scene/SeasonalDecor";

function NameTag({
  agent,
  selected,
}: {
  agent: OfficeAgent;
  selected: boolean;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fffdf5";
    ctx.beginPath();
    ctx.roundRect(5, 5, 502, 118, 22);
    ctx.fill();
    ctx.strokeStyle = selected ? agent.color : "#e2e5d7";
    ctx.lineWidth = selected ? 6 : 2;
    ctx.stroke();
    ctx.fillStyle = statuses[agent.status].color;
    ctx.beginPath();
    ctx.arc(43, 64, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#495344";
    ctx.font = "bold 35px sans-serif";
    ctx.fillText(agent.name, 70, 77);
    ctx.fillStyle = "#8e9782";
    ctx.font = "25px sans-serif";
    ctx.fillText(`${seasons[agent.season].label} · ${agent.role}`, 200, 75);
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, [
    agent.name,
    agent.role,
    agent.status,
    agent.season,
    agent.color,
    selected,
  ]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={[0, 2.55, 0]} scale={[2.5, 0.625, 1]}>
      <spriteMaterial
        map={texture}
        depthTest={false}
        toneMapped={false}
        transparent
      />
    </sprite>
  );
}
function Workstation({
  agent,
  selected,
  onSelect,
  motionEnabled,
}: {
  agent: OfficeAgent;
  motionEnabled: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(agent.id);
  };
  return (
    <group
      position={agent.position}
      onClick={click}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <Box
        p={[0, 1, 0]}
        s={[2.2, 0.14, 1.1]}
        c={
          agent.season === "winter"
            ? "#c8d9dc"
            : agent.season === "spring"
              ? "#dfc6c1"
              : agent.season === "summer"
                ? "#e8d19e"
                : "#d5b28e"
        }
      />
      {[-0.9, 0.9].map((x) => (
        <Box key={x} p={[x, 0.5, 0]} s={[0.1, 1, 0.78]} c="#e7e4db" />
      ))}
      <Box p={[0, 1.53, -0.24]} s={[1.02, 0.67, 0.1]} c="#3b4546" />
      <Box
        p={[0, 1.54, -0.178]}
        s={[0.9, 0.54, 0.015]}
        c={agent.status === "error" ? "#c47c6b" : "#b2c8c4"}
      />
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          p={[-0.16 + i * 0.04, 1.67 - i * 0.13, -0.163]}
          s={[0.49 - i * 0.08, 0.025, 0.012]}
          c={agent.color}
        />
      ))}
      <Box p={[0, 1.16, -0.22]} s={[0.08, 0.3, 0.08]} c="#5d6564" />
      <Box p={[0, 1.09, 0.23]} s={[0.65, 0.035, 0.24]} c="#e4e5dc" />
      <mesh position={[0.78, 1.18, 0.16]}>
        <cylinderGeometry args={[0.095, 0.08, 0.2, 12]} />
        <meshStandardMaterial color={agent.color} />
      </mesh>
      <DeskDecor season={agent.season} />
      <Mascot agent={agent} selected={selected} motionEnabled={motionEnabled} />
      <NameTag agent={agent} selected={selected} />
    </group>
  );
}
function CameraFit({ resetKey }: { resetKey: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as OrthographicCamera;
    cam.position.set(11, 12, 14);
    cam.zoom = Math.max(15, Math.min(size.width / 16, size.height / 11));
    cam.lookAt(0, 0.7, 0);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, resetKey]);
  return null;
}
export default function OfficeScene({
  agents,
  selected,
  onSelect,
  resetKey,
  motionEnabled,
}: {
  agents: OfficeAgent[];
  selected: string;
  onSelect: (id: string) => void;
  resetKey: number;
  motionEnabled: boolean;
}) {
  useEffect(
    () => () => {
      document.body.style.cursor = "auto";
    },
    [],
  );
  return (
    <Canvas
      shadows
      orthographic
      camera={{ position: [11, 12, 14], zoom: 49, near: 0.1, far: 100 }}
      dpr={[1, 1.7]}
      gl={{ antialias: true }}
      fallback={
        <div className="canvas-fallback">
          3D를 표시하려면 WebGL을 지원하는 브라우저를 사용하세요. 오른쪽 직원
          카드에서 업무를 확인할 수 있습니다.
        </div>
      }
    >
      <color attach="background" args={["#eeeae1"]} />
      <ambientLight intensity={1.6} />
      <directionalLight
        position={[3, 10, 5]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <group position={[0, -0.3, 0]}>
        <Box p={[0, -0.18, 0]} s={[10.6, 0.38, 8.6]} c="#b9aa91" />
        <Box p={[0, 0.03, 0]} s={[10.4, 0.12, 8.4]} c="#e2d5bd" />
        {Array.from({ length: 17 }, (_, i) => (
          <Box
            key={i}
            p={[-5 + i * 0.62, 0.096, 0]}
            s={[0.014, 0.005, 8.3]}
            c="#c9baa0"
            r={0}
          />
        ))}
        <Box p={[0, 1.65, -4.15]} s={[10.5, 3.3, 0.16]} c="#e9e5d9" />
        <Box p={[-5.15, 1.65, 0]} s={[0.16, 3.3, 8.4]} c="#e9e5d9" />
        {[-3.7, -1.25, 1.25, 3.7].map((x, i) => {
          const season = (["winter", "spring", "summer", "autumn"] as const)[i];
          return (
            <group key={season}>
              <Box p={[x, 2.13, -4.04]} s={[1.95, 1.62, 0.08]} c="#fff8e8" />
              <Box
                p={[x, 2.13, -3.985]}
                s={[1.75, 1.42, 0.04]}
                c={seasons[season].light}
              />
              <Box p={[x, 2.13, -3.95]} s={[0.045, 1.42, 0.04]} c="#fff8e8" />
              <Box p={[x, 2.13, -3.945]} s={[1.75, 0.045, 0.04]} c="#fff8e8" />
              <Box p={[x, 1.29, -3.86]} s={[2.05, 0.1, 0.32]} c="#e4d3b4" />
            </group>
          );
        })}
        <Box p={[-5.02, 2.15, -0.9]} s={[0.08, 1.1, 2.8]} c="#c5b593" />
        <Box p={[-4.96, 2.15, -0.9]} s={[0.04, 0.95, 2.62]} c="#faf3e4" />
        {(["winter", "spring", "summer", "autumn"] as const).map(
          (season, i) => (
            <Box
              key={season}
              p={[-4.92, 2.15, -1.8 + i * 0.6]}
              s={[0.03, 0.5, 0.38]}
              c={seasons[season].accent}
            />
          ),
        )}
        {agents.map((agent) => (
          <SeasonPatch key={agent.id} agent={agent} />
        ))}
        <MeetingGarden />
        <SeasonalTree
          season="winter"
          position={[-4.35, 0.1, -3.15]}
          scale={1.05}
        />
        <SeasonalTree
          season="spring"
          position={[4.35, 0.1, -3.1]}
          scale={1.05}
        />
        <SeasonalTree
          season="summer"
          position={[-4.35, 0.1, 3.2]}
          scale={0.85}
        />
        <SeasonalTree season="autumn" position={[4.4, 0.1, 3.2]} scale={0.9} />
        {agents.map((agent) => (
          <Workstation
            key={agent.id}
            agent={agent}
            motionEnabled={motionEnabled}
            selected={selected === agent.id}
            onSelect={onSelect}
          />
        ))}
      </group>
      <CameraFit resetKey={resetKey} />
      <OrbitControls
        key={resetKey}
        makeDefault
        target={[0, 0.7, 0]}
        minZoom={15}
        maxZoom={85}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2.3}
        enablePan={false}
      />
    </Canvas>
  );
}
