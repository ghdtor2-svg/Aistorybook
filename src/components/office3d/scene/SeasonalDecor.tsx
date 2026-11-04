import { OfficeAgent, Season, seasons } from "../design";
import { Ball, Box, Stem, Vec3 } from "./Primitives";

function Blossom({
  p,
  scale = 1,
  color = "#e8adbf",
}: {
  p: Vec3;
  scale?: number;
  color?: string;
}) {
  return (
    <group position={p} scale={scale}>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i * Math.PI * 2) / 5;
        return (
          <Ball
            key={i}
            p={[Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0]}
            s={[0.1, 0.1, 0.055]}
            c={color}
          />
        );
      })}
      <Ball p={[0, 0, 0.04]} s={[0.075, 0.075, 0.04]} c="#f3d88f" />
    </group>
  );
}
export function SeasonalTree({
  season,
  position,
  scale = 1,
}: {
  season: Season;
  position: Vec3;
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.33, 0.26, 0.36, 20]} />
        <meshStandardMaterial
          color={
            season === "winter"
              ? "#d3e2e4"
              : season === "spring"
                ? "#e2bdc3"
                : "#d0b08e"
          }
        />
      </mesh>
      <Stem p={[0, 0.87, 0]} h={1.45} r={0.065} />
      <Stem p={[-0.18, 1.14, 0]} h={0.63} r={0.035} rotation={[0, 0, -0.65]} />
      <Stem p={[0.18, 1.4, 0.03]} h={0.55} r={0.035} rotation={[0, 0, 0.65]} />
      {season === "winter" ? (
        <>
          {[0, 1, 2].map((i) => (
            <group key={i}>
              <mesh position={[0, 1 + i * 0.3, 0]} castShadow>
                <coneGeometry args={[0.47 - i * 0.12, 0.63, 12]} />
                <meshStandardMaterial color="#8eaeaa" />
              </mesh>
              <mesh position={[0, 1.13 + i * 0.3, 0]} castShadow>
                <coneGeometry args={[0.37 - i * 0.1, 0.41, 12]} />
                <meshStandardMaterial color="#f3f7f4" />
              </mesh>
            </group>
          ))}
        </>
      ) : (
        <>
          {[
            [-0.28, 1.4, 0.04],
            [0.27, 1.63, 0.04],
            [0, 1.85, 0],
            [0, 1.48, -0.2],
          ].map((v, i) => (
            <Ball
              key={i}
              p={v as Vec3}
              s={[0.42, 0.4, 0.36]}
              c={
                season === "spring"
                  ? ["#edbfd0", "#f3d0da", "#e9adbf", "#e8b9c9"][i]
                  : season === "autumn"
                    ? ["#dca064", "#cf8655", "#e8b87c", "#bc8b5d"][i]
                    : ["#91af84", "#a3b98b", "#b3c794", "#829f77"][i]
              }
            />
          ))}
          {season === "spring" &&
            [
              [-0.35, 1.5, 0.35],
              [0.3, 1.7, 0.35],
              [0, 1.93, 0.25],
            ].map((p, i) => <Blossom key={i} p={p as Vec3} scale={0.7} />)}
        </>
      )}
    </group>
  );
}
export function SeasonPatch({ agent }: { agent: OfficeAgent }) {
  const theme = seasons[agent.season];
  return (
    <group position={agent.position}>
      <Box
        p={[0, 0.12, 0.3]}
        s={[2.85, 0.035, 2.95]}
        c={theme.floor}
        r={0.08}
      />
      {/* A trim anchors each season without obstructing the workspace. */}
      <Box
        p={[0, 0.15, 1.78]}
        s={[2.78, 0.025, 0.055]}
        c={agent.color}
        r={0.012}
      />
      {agent.season === "spring" ? (
        <>
          {[-1, 0, 1].map((n) => (
            <group
              key={n}
              position={[n * 0.82, 0.17, 1.5]}
              rotation={[-Math.PI / 2, 0, n * 0.5]}
            >
              <Blossom p={[0, 0, 0]} scale={0.48} />
            </group>
          ))}
        </>
      ) : agent.season === "summer" ? (
        <>
          {[0, 1, 2].map((i) => (
            <group key={i} position={[-0.85 + i * 0.85, 0.17, 1.45]}>
              <Stem p={[0, 0.12, 0]} h={0.22} r={0.018} c="#879a65" />
              <Blossom p={[0, 0.27, 0]} scale={0.5} color="#efc669" />
            </group>
          ))}
        </>
      ) : agent.season === "autumn" ? (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <Ball
              key={i}
              p={[-1 + i * 0.48, 0.17, 1.35 + (i % 2) * 0.15]}
              s={[0.12, 0.018, 0.065]}
              rotation={[0, i * 0.8, 0]}
              c={i % 2 ? "#d79b65" : "#c7a16c"}
            />
          ))}
        </>
      ) : (
        <>
          {[-1, 1].map((i) => (
            <group key={i} position={[i * 1.1, 0.17, 1.45]}>
              <Ball s={[0.16, 0.035, 0.15]} c="#f7faf8" />
              <Ball p={[0.1, 0, -0.1]} s={[0.12, 0.03, 0.12]} c="#f7faf8" />
            </group>
          ))}
        </>
      )}
    </group>
  );
}
export function DeskDecor({ season }: { season: Season }) {
  return (
    <group position={[-0.83, 1.09, 0.1]}>
      {season === "winter" ? (
        <>
          <Ball p={[0, 0.09, 0]} s={[0.09, 0.09, 0.09]} c="#f4f9f8" />
          <Ball p={[0, 0.21, 0]} s={[0.065, 0.065, 0.065]} c="#f4f9f8" />
          <Ball
            p={[0.023, 0.22, 0.061]}
            s={[0.008, 0.009, 0.008]}
            c="#556a70"
          />
          <Ball
            p={[-0.023, 0.22, 0.061]}
            s={[0.008, 0.009, 0.008]}
            c="#556a70"
          />
          <Ball p={[0, 0.195, 0.07]} s={[0.014, 0.012, 0.027]} c="#dca26e" />
        </>
      ) : (
        <>
          <mesh position={[0, 0.065, 0]}>
            <cylinderGeometry args={[0.08, 0.055, 0.13, 12]} />
            <meshStandardMaterial
              color={
                season === "spring"
                  ? "#ddb8c5"
                  : season === "summer"
                    ? "#cbd7ae"
                    : "#d3a779"
              }
            />
          </mesh>
          <Stem p={[0, 0.17, 0]} h={0.15} r={0.012} c="#92a779" />
          {season === "spring" ? (
            <Blossom p={[0, 0.27, 0]} scale={0.4} />
          ) : season === "summer" ? (
            <Blossom p={[0, 0.27, 0]} scale={0.4} color="#efcb6c" />
          ) : (
            <Ball
              p={[0, 0.23, 0]}
              s={[0.08, 0.12, 0.025]}
              c="#dca16e"
              rotation={[0, 0, -0.4]}
            />
          )}
        </>
      )}
    </group>
  );
}
export function MeetingGarden() {
  const themes: Season[] = ["winter", "spring", "summer", "autumn"];
  return (
    <group>
      {themes.map((season, i) => (
        <mesh
          key={season}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.135, 0.3]}
          receiveShadow
        >
          <circleGeometry args={[1.65, 24, (i * Math.PI) / 2, Math.PI / 2]} />
          <meshStandardMaterial color={seasons[season].floor} />
        </mesh>
      ))}
      <mesh position={[0, 0.93, 0.3]} castShadow>
        <cylinderGeometry args={[1.02, 1.02, 0.14, 48]} />
        <meshStandardMaterial color="#e7d6b5" />
      </mesh>
      <Stem p={[0, 0.52, 0.3]} h={0.8} r={0.2} c="#baa887" />
      <mesh position={[0, 1.06, 0.3]}>
        <cylinderGeometry args={[0.25, 0.21, 0.12, 24]} />
        <meshStandardMaterial color="#f4edda" />
      </mesh>
      {themes.map((season, i) => (
        <group key={season} rotation={[0, (i * Math.PI) / 2, 0]}>
          <Stem p={[0.09, 1.26, 0.3]} h={0.28} r={0.012} c="#9ca981" />
          <Ball
            p={[0.09, 1.41, 0.3]}
            s={[0.09, 0.1, 0.07]}
            c={seasons[season].accent}
          />
          <Box
            p={[0, 0.56, 1.65]}
            s={[0.55, 0.12, 0.55]}
            c={seasons[season].accent}
          />
          <Box
            p={[0, 0.88, 1.87]}
            s={[0.55, 0.6, 0.1]}
            c={seasons[season].accent}
          />
          <Stem p={[0, 0.28, 1.65]} h={0.55} r={0.045} c="#b1a181" />
        </group>
      ))}
    </group>
  );
}
