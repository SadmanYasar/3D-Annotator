import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import {
  Environment,
  OrbitControls,
  useGLTF,
  Loader,
  DragControls,
  GizmoHelper,
  GizmoViewport,
  Billboard,
  Stats,
  Center,
  Bounds,
} from "@react-three/drei";
import { RefObject, Suspense, useEffect, useRef, useState } from "react";
import { Text, Input, Root } from "@react-three/uikit";
import * as THREE from "three";

interface ModelProps {
  url: string;
  onModelClick: (
    point: THREE.Vector3,
    modelRef: RefObject<THREE.Group>
  ) => void;
  color: string; // New prop for color
}

function Model({ url, onModelClick, color }: ModelProps) {
  const gltf = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.isModel = true;
      // Update material color for all meshes in the model
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material && material.color) {
            material.color.set(color);
          }
        }
      });
    }
  }, [color]); // Re-run when color changes

  return (
    <Center>
      <Bounds fit clip observe margin={1.2} maxDuration={1}>
        <group ref={groupRef} scale={[0.02, 0.02, 0.02]} position={[0, 0, 0]}>
          <primitive
            object={gltf.scene}
            onDoubleClick={(e: any) => {
              e.stopPropagation();
              console.log("Model clicked at:", e.point);
              onModelClick(e.point, groupRef);
            }}
          />
        </group>
      </Bounds>
    </Center>
  );
}

interface AnnotationProps {
  positionRef: RefObject<number[]>;
  textRef: RefObject<string>;
  modelRef: RefObject<THREE.Group>;
}

function Annotation({ positionRef, textRef, modelRef }: AnnotationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(textRef.current);
  const pivotRef = useRef<THREE.Mesh>(null);
  const textMeshRef = useRef<THREE.Group>(null);
  const lineRef = useRef<any>(null);
  const { raycaster, camera, pointer } = useThree();

  const positions = useRef(new Float32Array(6));

  const handleDrag = (event: any) => {
    if (!pivotRef.current || !modelRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(modelRef.current, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      pivotRef.current.position
        .copy(point)
        .add(intersects[0].normal.multiplyScalar(0.01));
      positionRef.current = [point.x, point.y, point.z];
    }
  };

  useFrame(() => {
    if (pivotRef.current && textMeshRef.current && lineRef.current) {
      const pivotWorldPos = new THREE.Vector3();
      const textWorldPos = new THREE.Vector3();

      pivotRef.current.getWorldPosition(pivotWorldPos);
      textMeshRef.current.getWorldPosition(textWorldPos);

      positions.current[0] = pivotWorldPos.x;
      positions.current[1] = pivotWorldPos.y;
      positions.current[2] = pivotWorldPos.z;
      positions.current[3] = textWorldPos.x;
      positions.current[4] = textWorldPos.y;
      positions.current[5] = textWorldPos.z;

      const positionAttribute = lineRef.current.geometry.attributes.position;
      positionAttribute.array.set(positions.current);
      positionAttribute.needsUpdate = true;
      lineRef.current.geometry.computeBoundingSphere();
    }
  });

  return (
    <group>
      <DragControls onDrag={handleDrag}>
        <mesh
          ref={pivotRef}
          position={positionRef.current as [number, number, number]}
        >
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshBasicMaterial color="red" />
        </mesh>
      </DragControls>

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

      <DragControls dragConfig={{ enabled: !isEditing }}>
        <Billboard
          ref={textMeshRef}
          position={
            [
              positionRef.current[0] + 0.5,
              positionRef.current[1],
              positionRef.current[2] + 0.5,
            ] as [number, number, number]
          }
        >
          <mesh>
            <Root
              hover={{ backgroundOpacity: 0.8 }}
              padding={4}
              borderRadius={4}
            >
              {isEditing ? (
                <>
                  <Input
                    value={text}
                    onValueChange={(value: string) => {
                      setText(value);
                      textRef.current = value;
                    }}
                    fontSize={48}
                    padding={12}
                    borderRadius={8}
                    color="black"
                    backgroundColor="red"
                  />
                  <Text
                    positionType="relative"
                    fontSize={32}
                    marginTop={-30}
                    fontWeight={"bold"}
                    onClick={() => setIsEditing(false)}
                  >
                    Close
                  </Text>
                </>
              ) : (
                <>
                  <Text
                    fontSize={48}
                    color="white"
                    backgroundColor="blue"
                    padding={12}
                    borderRadius={8}
                  >
                    {text || "Annotation"}
                  </Text>
                  <Text
                    onClick={() => setIsEditing(true)}
                    color="orange"
                    fontSize={32}
                    positionType="relative"
                    marginTop={-30}
                    fontWeight={"bold"}
                  >
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
  const [modelUrlRef, setModelUrlRef] = useState<string | null>(null);
  const [modelColor, setModelColor] = useState<string>("#ffffff"); // Default white
  const annotationsRef = useRef<
    {
      positionRef: RefObject<number[]>;
      textRef: RefObject<string>;
      modelRef: RefObject<THREE.Group>;
    }[]
  >([]);
  const cameraRef = useRef<THREE.Camera>(null);
  const originalCameraPosition = useRef(new THREE.Vector3(0, 0, 20));
  const [modelLoaded, setModelLoaded] = useState(false);
  const [, setAnnotationCount] = useState(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setModelUrlRef(URL.createObjectURL(file));
      setModelLoaded(true);
    }
  };

  const handleModelClick = (
    point: THREE.Vector3,
    modelRef: RefObject<THREE.Group>
  ) => {
    console.log("Model clicked at:", point);
    annotationsRef.current.push({
      positionRef: { current: [point.x, point.y, point.z] },
      textRef: { current: "Annotation" },
      modelRef,
    });
    setAnnotationCount(annotationsRef.current.length);
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setModelColor(event.target.value);
  };

  useEffect(() => {
    setModelUrlRef("/tshirt.glb");
    setModelLoaded(true);
  }, []);

  return (
    <div style={{ height: "100vh" }}>
      <input
        type="file"
        accept=".gltf,.glb"
        onChange={handleFileUpload}
        style={{ position: "absolute", zIndex: 1, top: 0, right: 0 }}
      />
      <input
        type="color"
        value={modelColor}
        onChange={handleColorChange}
        style={{
          position: "absolute",
          zIndex: 1,
          top: 40,
          right: 0,
          width: "50px",
          height: "50px",
          border: "2px solid black",
          cursor: "pointer",
        }}
      />
      <Canvas
        shadows
        orthographic
        camera={{
          near: 0.1,
          far: 1000,
          position: [0, 0, 20],
        }}
        onCreated={({ camera }) => {
          cameraRef.current = camera;
          originalCameraPosition.current.copy(camera.position);
          camera.lookAt(0, 0, 0);
        }}
      >
        <color attach="background" args={["#ffffff"]} />
        <Stats />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Environment preset="night" />
        <axesHelper />
        <Physics timeStep="vary">
          <Suspense fallback={null}>
            {modelLoaded && modelUrlRef && (
              <Model
                url={modelUrlRef}
                onModelClick={handleModelClick}
                color={modelColor} // Pass the selected color
              />
            )}
          </Suspense>
          {annotationsRef.current.map((annotation, index) => (
            <Suspense key={index} fallback={null}>
              <Annotation
                positionRef={annotation.positionRef}
                textRef={annotation.textRef}
                modelRef={annotation.modelRef}
              />
            </Suspense>
          ))}
        </Physics>

        <OrbitControls
          makeDefault
          enableRotate={true}
          enablePan={true}
          target={[0, 0, 0]}
        />
        <GizmoHelper alignment="bottom-right" margin={[100, 100]}>
          <GizmoViewport labelColor="white" axisHeadScale={1} />
        </GizmoHelper>
      </Canvas>
      <Loader />
    </div>
  );
}
