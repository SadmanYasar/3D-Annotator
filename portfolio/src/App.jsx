import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import {
  Environment,
  OrbitControls,
  useGLTF,
  Loader,
  DragControls,
  GizmoHelper,
  GizmoViewport,
  Billboard
} from "@react-three/drei";
import { Suspense, useRef, useState } from "react";
import { Text, Input, Root } from "@react-three/uikit";
import * as THREE from "three";

function Model({ url, onModelClick }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef();

  return (
    <group ref={groupRef} scale={[1, 1, 1]} position={[0, 0, 0]}>
      <primitive
        object={scene}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onModelClick(e.point);
        }}
      />
    </group>
  );
}

function Annotation({ positionRef, textRef }) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(textRef.current);
  const pivotRef = useRef();
  const textMeshRef = useRef();
  const lineRef = useRef();

  // Initialize positions array for the line geometry
  const positions = useRef(new Float32Array(6)); // 2 points, 3 coords each: [x1, y1, z1, x2, y2, z2]

  useFrame(() => {
    if (pivotRef.current && textMeshRef.current && lineRef.current) {
      const pivotWorldPos = new THREE.Vector3();
      const textWorldPos = new THREE.Vector3();

      // Get world positions
      pivotRef.current.getWorldPosition(pivotWorldPos);
      textMeshRef.current.getWorldPosition(textWorldPos);

      // Update positions array
      positions.current[0] = pivotWorldPos.x;
      positions.current[1] = pivotWorldPos.y;
      positions.current[2] = pivotWorldPos.z;
      positions.current[3] = textWorldPos.x;
      positions.current[4] = textWorldPos.y;
      positions.current[5] = textWorldPos.z;

      // Update the geometry's position attribute
      const positionAttribute = lineRef.current.geometry.attributes.position;
      positionAttribute.array.set(positions.current);
      positionAttribute.needsUpdate = true;

      // Update bounding sphere for correct rendering
      lineRef.current.geometry.computeBoundingSphere();
    }
  });

  return (
    <group>
      {/* Pivot point with DragControls */}
      <DragControls>
        <mesh ref={pivotRef} position={positionRef.current}>
          <sphereGeometry args={[0.05, 32, 32]} />
          <meshBasicMaterial color="red" />
        </mesh>
      </DragControls>

      {/* Line connecting pivot and text */}
      <line ref={lineRef}>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={positions.current}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="red" linewidth={3} />
      </line>

      {/* Text with DragControls */}
      <DragControls
        dragConfig={{
          enabled: !isEditing,
        }}
      >
        <Billboard ref={textMeshRef}
          position={[
            positionRef.current[0] + 0.5,
            positionRef.current[1],
            positionRef.current[2] + 0.5,
          ]}>
          <mesh
          >
            <Root
              hover={{ backgroundOpacity: 0.8 }}
              padding={4}
              borderRadius={4}
            >
              {isEditing ? (
                <>
                  <Input
                    value={text}
                    onValueChange={(value) => {
                      setText(value);
                      textRef.current = value;
                    }}
                    fontSize={16}
                    padding={8}
                    borderRadius={4}
                    color="black"
                    backgroundColor="red"
                    autoFocus
                  />
                  <Text
                    positionType="relative"
                    marginTop={-30}
                    onClick={() => setIsEditing(false)}
                  >
                    Close
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    fontSize={16}
                    color="white"
                    backgroundColor="blue"
                    padding={8}
                    borderRadius={4}
                  >
                    {text || "Annotation"}
                  </Text>
                  <Text onClick={() => setIsEditing(true)} color="green" positionType="relative"
                    marginTop={-30}>
                    Edit
                  </Text>
                </>
              )}
            </Root>
          </mesh>
        </Billboard>
      </DragControls>
    </group>
  );
}

export default function App() {
  const [modelUrlRef, setModelUrlRef] = useState(null);
  const modelPositionRef = useRef([0, 0, 0]);
  const annotationsRef = useRef([]);
  const cameraRef = useRef();
  const originalCameraPosition = useRef(new THREE.Vector3(0, 0, 5));
  const [modelLoaded, setModelLoaded] = useState(false);
  const [, setAnnotationCount] = useState(0);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setModelUrlRef(URL.createObjectURL(file));
      setModelLoaded(true);
    }
  };

  const handleModelClick = (point) => {
    console.log("Model clicked at:", point);
    annotationsRef.current.push({
      positionRef: { current: [point.x, point.y, point.z] },
      textRef: { current: "Annotation" },
    });
    setAnnotationCount(annotationsRef.current.length); // Force re-render
  };

  return (
    <div style={{ height: "100vh" }}>
      <input
        type="file"
        accept=".gltf,.glb"
        onChange={handleFileUpload}
        style={{ position: "absolute", zIndex: 1 }}
      />
      <Canvas
        shadows
        orthographic
        camera={{
          fov: 65,
          near: 0.1,
          far: 10000,
          position: [0, 0, 5],
        }}
        onCreated={({ camera }) => {
          cameraRef.current = camera;
          originalCameraPosition.current.copy(camera.position);
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Environment preset="night" />

        <Physics timeStep="vary">
          <Suspense fallback={null}>
            {modelLoaded && modelUrlRef && (
              <Model
                url={modelUrlRef}
                positionRef={modelPositionRef}
                onModelClick={handleModelClick}
              />
            )}
          </Suspense>

          {annotationsRef.current.map((annotation, index) => (
            <Suspense key={index} fallback={null}>
              <Annotation
                positionRef={annotation.positionRef}
                textRef={annotation.textRef}
                cameraRef={cameraRef}
                originalCameraPosition={originalCameraPosition.current}
              />
            </Suspense>
          ))}
        </Physics>

        <OrbitControls makeDefault enableRotate={true} enablePan={false} />
        <GizmoHelper alignment="bottom-right" margin={[100, 100]}>
          <GizmoViewport labelColor="white" axisHeadScale={1} />
        </GizmoHelper>
      </Canvas>
      <Loader />
    </div>
  );
}