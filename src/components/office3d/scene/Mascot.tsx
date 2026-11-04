"use client";
import {mascotPose} from '../motion';
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Shape } from "three";
import { OfficeAgent, statuses } from "../design";
import { Ball, Box, Stem } from "./Primitives";

const leafShape = new Shape();
leafShape.moveTo(0, -0.51);
leafShape.bezierCurveTo(-0.2, -0.4, -0.49, -0.46, -0.43, -0.23);
leafShape.bezierCurveTo(-0.75, -0.2, -0.64, -0.03, -0.49, 0.13);
leafShape.bezierCurveTo(-0.69, 0.49, -0.38, 0.44, -0.23, 0.39);
leafShape.bezierCurveTo(-0.13, 0.68, 0.04, 0.77, 0.15, 0.44);
leafShape.bezierCurveTo(0.5, 0.61, 0.63, 0.48, 0.46, 0.22);
leafShape.bezierCurveTo(0.81, 0.19, 0.66, -0.09, 0.43, -0.19);
leafShape.bezierCurveTo(0.57, -0.44, 0.26, -0.43, 0, -0.51);

function Face({
  error = false,
  glasses = false,
}: {
  error?: boolean;
  glasses?: boolean;
}) {
  return (
    <group position={[0, 0.04, 0.245]}>
      {[-1, 1].map((side) => (
        <group key={side}>
          <Ball
            p={[side * 0.145, 0.04, 0.025]}
            s={[0.047, 0.062, 0.035]}
            c="#302c2a"
          />
          <Ball
            p={[side * 0.145 - 0.012, 0.061, 0.054]}
            s={[0.013, 0.017, 0.009]}
            c="#fffef7"
          />
          <Ball
            p={[side * 0.24, -0.09, 0.015]}
            s={[0.075, 0.045, 0.018]}
            c="#edaaa0"
          />
          {glasses && (
            <mesh position={[side * 0.15, 0.04, 0.065]}>
              <torusGeometry args={[0.115, 0.014, 8, 32]} />
              <meshStandardMaterial color="#394e66" />
            </mesh>
          )}
        </group>
      ))}
      {glasses && (
        <Box
          p={[0, 0.06, 0.068]}
          s={[0.065, 0.018, 0.018]}
          c="#394e66"
          r={0.005}
        />
      )}
      {error ? (
        <Ball p={[0, -0.13, 0.045]} s={[0.035, 0.045, 0.02]} c="#754f44" />
      ) : (
        <mesh position={[0, -0.085, 0.035]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.066, 0.017, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#754f44" />
        </mesh>
      )}
    </group>
  );
}
function SnowBody({error}: {error:boolean}) {
  return (
    <group>
      <Ball s={[0.39, 0.4, 0.22]} c="#f1faff" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3;
        return (
          <group key={i} rotation={[0, 0, a]}>
            <Ball p={[0, 0.41, 0]} s={[0.13, 0.25, 0.17]} c="#b6def0" />
            <Ball p={[0, 0.37, 0.1]} s={[0.065, 0.23, 0.09]} c="#f1faff" />
            {[-1, 1].map((side) => (
              <Ball
                key={side}
                p={[side * 0.13, 0.43, 0]}
                s={[0.085, 0.16, 0.13]}
                c="#b6def0"
                rotation={[0, 0, side * -0.7]}
              />
            ))}
          </group>
        );
      })}
      <Face glasses error={error} />
    </group>
  );
}
function LeafBody({error}: {error:boolean}) {
  return (
    <group>
      <mesh position={[0, 0, -0.13]} castShadow receiveShadow>
        <extrudeGeometry
          args={[
            leafShape,
            {
              depth: 0.22,
              bevelEnabled: true,
              bevelThickness: 0.07,
              bevelSize: 0.06,
              bevelSegments: 3,
              steps: 1,
              curveSegments: 12,
            },
          ]}
        />
        <meshStandardMaterial color="#e9a06a" roughness={0.85} />
      </mesh>
      <Stem
        p={[0.1, 0.66, 0]}
        h={0.26}
        r={0.055}
        c="#916442"
        rotation={[0, 0, -0.4]}
      />
      <Stem p={[0, -0.25, 0.2]} h={0.43} r={0.018} c="#f5c48e" />
      {[-1, 1].map((s) => (
        <Stem
          key={s}
          p={[s * 0.13, -0.2, 0.2]}
          h={0.32}
          r={0.012}
          c="#f5c48e"
          rotation={[0, 0, s * -0.8]}
        />
      ))}
      <Face error={error} />
    </group>
  );
}
function SunBody({error}: {error:boolean}) {
  return (
    <group>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <Ball
            key={i}
            p={[Math.sin(a) * 0.47, Math.cos(a) * 0.47, 0]}
            s={[0.13, 0.24, 0.14]}
            rotation={[0, 0, -a]}
            c="#efbd57"
          />
        );
      })}
      <Ball s={[0.43, 0.43, 0.23]} c="#ffda77" />
      <Face error={error} />
    </group>
  );
}
function FlowerBody({error}: {error:boolean}) {
  return (
    <group>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i * Math.PI * 2) / 5;
        return (
          <Ball
            key={i}
            p={[Math.sin(a) * 0.39, Math.cos(a) * 0.39, -0.03]}
            s={[0.25, 0.32, 0.17]}
            rotation={[0, 0, -a]}
            c={i % 2 ? "#efb0c0" : "#f4c0cd"}
          />
        );
      })}
      <Ball s={[0.33, 0.33, 0.23]} c="#f8dfa0" />
      <Face error={error} />
    </group>
  );
}
function Accessory({ season }: { season: OfficeAgent["season"] }) {
  return (
    <group position={[0, -0.32, 0.42]}>
      {season === "winter" ? (
        <>
          <Box p={[0, 0, 0]} s={[0.48, 0.3, 0.055]} c="#657f9c" />
          <Box p={[0, -0.16, 0.06]} s={[0.52, 0.025, 0.18]} c="#8ba4b8" />
          {[-1, 1].map((i) => (
            <group
              key={i}
              position={[i * 0.09, 0, 0.035]}
              rotation={[0, 0, i * 0.45]}
            >
              <Box
                p={[0, 0, 0]}
                s={[0.022, 0.12, 0.018]}
                c="#edf6fa"
                r={0.004}
              />
            </group>
          ))}
        </>
      ) : season === "autumn" ? (
        <group position={[-0.25, 0.1, 0]} rotation={[0, 0, 0.5]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.15, 0.28, 24, 1, true]} />
            <meshStandardMaterial color="#fff0d4" side={2} />
          </mesh>
          <Ball p={[-0.14, 0, 0]} s={[0.025, 0.13, 0.13]} c="#d57d52" />
          <Box p={[0.035, -0.14, 0]} s={[0.06, 0.16, 0.06]} c="#a5734f" />
        </group>
      ) : (
        <>
          <Box p={[0, 0, 0]} s={[0.47, 0.32, 0.055]} c="#fff1d4" />
          {season === "summer"
            ? [-1, 0, 1].map((i) => (
                <Ball
                  key={i}
                  p={[i * 0.12, 0, 0.045]}
                  s={[0.045, 0.045, 0.015]}
                  c={["#eaa188", "#a8bc8a", "#a3c7d4"][i + 1]}
                />
              ))
            : [0, 1].map((i) => (
                <group key={i}>
                  <Box
                    p={[0.04, 0.065 - i * 0.12, 0.038]}
                    s={[0.19, 0.016, 0.015]}
                    c="#c6b58e"
                    r={0.003}
                  />
                  <Box
                    p={[-0.14, 0.065 - i * 0.12, 0.038]}
                    s={[0.045, 0.045, 0.015]}
                    c="#91a77b"
                    r={0.008}
                  />
                </group>
              ))}
        </>
      )}
    </group>
  );
}
export default function Mascot({
  agent,
  selected,
  motionEnabled,
}: {
  agent: OfficeAgent;
  selected: boolean;
  motionEnabled: boolean;
}) {
  const ref = useRef<Group>(null);
  const leftHand=useRef<Group>(null),rightHand=useRef<Group>(null);
  const reduced = useRef(true);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reduced.current = mq.matches;
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pose=mascotPose(agent.status,clock.elapsedTime,motionEnabled&&!reduced.current);
    ref.current.position.y=pose.y;ref.current.rotation.set(pose.lean,pose.turn,pose.tilt);
    if(leftHand.current)leftHand.current.position.y=pose.leftHand;
    if(rightHand.current)rightHand.current.position.y=pose.rightHand;
  });
  const hand =
    agent.season === "winter"
      ? "#b6def0"
      : agent.season === "spring"
        ? "#91aa77"
        : agent.season === "summer"
          ? "#fff0b5"
          : "#a97550";
  return (
    <group position={[0, 0, 0.95]}>
      <mesh position={[0, 0.48, 0]} castShadow>
        <cylinderGeometry args={[0.46, 0.4, 0.16, 32]} />
        <meshStandardMaterial
          color={
            agent.season === "winter"
              ? "#bdd7e1"
              : agent.season === "spring"
                ? "#d5dfb9"
                : agent.season === "summer"
                  ? "#f5d999"
                  : "#e8c2a0"
          }
        />
      </mesh>
      <Stem p={[0, 0.25, 0]} h={0.4} r={0.09} c="#c1ac8a" />
      <group ref={ref} position={[0, 1.25, 0]} rotation={[0, 0.32, 0]}>
        {agent.season === "winter" ? (
          <SnowBody error={agent.status === "error"} />
        ) : agent.season === "spring" ? (
          <FlowerBody error={agent.status === "error"} />
        ) : agent.season === "summer" ? (
          <SunBody error={agent.status === "error"} />
        ) : (
          <LeafBody error={agent.status === "error"} />
        )}
        {[-1, 1].map((i) => (
          <group key={i}>
            <Ball p={[i * 0.19, -0.58, 0.08]} s={[0.13, 0.11, 0.18]} c={hand} />
            <group ref={i===-1?leftHand:rightHand}><Ball p={[i * 0.32, -0.28, 0.34]} s={[0.12, 0.14, 0.12]} c={hand} /></group>
          </group>
        ))}
        <Accessory season={agent.season} />
        {agent.status === "error" && (
          <group position={[0.56, 0.6, 0]}>
            <Ball s={[0.13, 0.13, 0.1]} c="#d87a65" />
            <Box
              p={[0, 0.025, 0.11]}
              s={[0.022, 0.09, 0.014]}
              c="#fff5e6"
              r={0.004}
            />
            <Ball p={[0, -0.055, 0.11]} s={[0.013, 0.013, 0.01]} c="#fff5e6" />
          </group>
        )}
        {agent.status === "done" && (
          <group position={[0.5, 0.62, 0]} rotation={[0, 0, -0.25]}>
            <Box p={[-0.035, -0.02, 0]} s={[0.035, 0.12, 0.035]} c="#82a078" />
            <Box p={[0.04, 0.025, 0]} s={[0.035, 0.22, 0.035]} c="#82a078" />
          </group>
        )}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry
          args={[selected ? 0.59 : 0.56, selected ? 0.65 : 0.59, 48]}
        />
        <meshBasicMaterial
          color={selected ? agent.color : statuses[agent.status].color}
          transparent
          opacity={selected ? 0.95 : 0.45}
        />
      </mesh>
    </group>
  );
}
