import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

function RobotHead() {
  const ref = useRef<THREE.Group>(null);
  const eyeL = useRef<THREE.Mesh>(null);
  const eyeR = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.3;
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.1;
    }
    if (eyeL.current && eyeR.current) {
      const s = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.05;
      eyeL.current.scale.set(s, s, s);
      eyeR.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={ref} position={[0, 0.8, 0]}>
      {/* Head */}
      <mesh>
        <boxGeometry args={[1.6, 1.2, 1.2]} />
        <meshStandardMaterial color="#0a1628" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Visor */}
      <mesh position={[0, 0.05, 0.61]}>
        <boxGeometry args={[1.4, 0.6, 0.05]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.3} metalness={1} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      {/* Eyes */}
      <mesh ref={eyeL} position={[-0.35, 0.05, 0.65]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} />
      </mesh>
      <mesh ref={eyeR} position={[0.35, 0.05, 0.65]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={2} />
      </mesh>
      {/* Antenna */}
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.1} />
      </mesh>
      <AntennaOrb />
      {/* Ear panels */}
      <mesh position={[-0.9, 0, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.8]} />
        <meshStandardMaterial color="#0f2847" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.9, 0, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.8]} />
        <meshStandardMaterial color="#0f2847" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function AntennaOrb() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      const mat = ref.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.8;
    }
  });

  return (
    <mesh ref={ref} position={[0, 1.05, 0]}>
      <sphereGeometry args={[0.08, 16, 16]} />
      <meshStandardMaterial color="#ffd600" emissive="#ffd600" emissiveIntensity={1.5} />
    </mesh>
  );
}

function RobotBody() {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.15;
    }
  });

  return (
    <group ref={ref}>
      {/* Torso */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[1.4, 1.4, 0.9]} />
        <meshStandardMaterial color="#0a1628" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Chest panel */}
      <mesh position={[0, -0.4, 0.46]}>
        <boxGeometry args={[0.8, 0.6, 0.02]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.15} transparent opacity={0.4} />
      </mesh>
      {/* Chest lines */}
      <ChestLine y={-0.25} width={0.6} color="#00e5ff" />
      <ChestLine y={-0.4} width={0.45} color="#ffd600" />
      <ChestLine y={-0.55} width={0.3} color="#00e5ff" />
      {/* Arms */}
      <Arm side={-1} />
      <Arm side={1} />
      {/* Legs */}
      <mesh position={[-0.3, -1.5, 0]}>
        <boxGeometry args={[0.35, 0.8, 0.4]} />
        <meshStandardMaterial color="#0f2847" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.3, -1.5, 0]}>
        <boxGeometry args={[0.35, 0.8, 0.4]} />
        <meshStandardMaterial color="#0f2847" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Feet */}
      <mesh position={[-0.3, -2.0, 0.1]}>
        <boxGeometry args={[0.4, 0.2, 0.6]} />
        <meshStandardMaterial color="#0a1628" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.3, -2.0, 0.1]}>
        <boxGeometry args={[0.4, 0.2, 0.6]} />
        <meshStandardMaterial color="#0a1628" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function ChestLine({ y, width, color }: { y: number; width: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 0.7 + Math.sin(clock.getElapsedTime() * 2 + y * 10) * 0.3;
      ref.current.scale.x = s;
    }
  });

  return (
    <mesh ref={ref} position={[0, y, 0.47]}>
      <boxGeometry args={[width, 0.05, 0.01]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} transparent opacity={0.6} />
    </mesh>
  );
}

function Arm({ side }: { side: number }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.8 + side) * 0.15;
    }
  });

  return (
    <group ref={ref} position={[side * 1.0, -0.5, 0]}>
      <mesh>
        <boxGeometry args={[0.3, 1.0, 0.35]} />
        <meshStandardMaterial color="#0f2847" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.65, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.3} metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

export function RobotScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5.5], fov: 40 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-3, 2, 3]} intensity={0.5} color="#00e5ff" />
      <pointLight position={[3, -1, 2]} intensity={0.3} color="#ffd600" />

      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <RobotHead />
        <RobotBody />
      </Float>

      <ContactShadows position={[0, -2.2, 0]} opacity={0.4} scale={5} blur={2.5} color="#00e5ff" />
      <Environment preset="night" />
    </Canvas>
  );
}
