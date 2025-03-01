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
import { Text, Input, Root, Image } from "@react-three/uikit";
import * as THREE from "three";

interface ModelProps {
  url: string;
  onModelClick: (
    point: THREE.Vector3,
    modelRef: RefObject<THREE.Group>
  ) => void;
  color: string;
}

function Model({ url, onModelClick, color }: ModelProps) {
  const gltf = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.userData.isModel = true;
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material && material.color) {
            material.color.set(color);
          }
        }
      });
    }
  }, [color]);

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
  contentRef: RefObject<string>;
  modelRef: RefObject<THREE.Group>;
  isImage: boolean;
  onDelete: () => void;
  onTypeChange: (isImage: boolean, newContent?: string) => void; // Updated to include new content
}

function Annotation({
  positionRef,
  contentRef,
  modelRef,
  isImage,
  onDelete,
  onTypeChange,
}: AnnotationProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(contentRef.current);
  const pivotRef = useRef<THREE.Mesh>(null);
  const contentMeshRef = useRef<THREE.Group>(null);
  const lineRef = useRef<any>(null);
  const { raycaster, camera, pointer } = useThree();

  const contentPositionRef = useRef<number[]>([
    positionRef.current[0] + 5,
    positionRef.current[1],
    positionRef.current[2] + 5,
  ]);

  const positions = useRef(new Float32Array(6));

  const handlePivotDrag = () => {
    if (!pivotRef.current || !modelRef.current) return;

    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(modelRef.current, true);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const point = intersection.point;
      const normal = intersection.normal;

      const offsetDistance = 0.05;
      const newPosition = point
        .clone()
        .add(normal.multiplyScalar(offsetDistance));

      pivotRef.current.position.copy(newPosition);
      positionRef.current = [newPosition.x, newPosition.y, newPosition.z];
    }
  };

  const handleContentDrag = (event: any) => {
    if (!contentMeshRef.current) return;
    const newPos = contentMeshRef.current.position;
    contentPositionRef.current = [newPos.x, newPos.y, newPos.z];
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setContent(url);
      contentRef.current = url;
      onTypeChange(true, url); // Update type and content
      setIsEditing(false);
    }
  };

  const handleTextChange = (value: string) => {
    setContent(value);
    contentRef.current = value;
  };

  useFrame(() => {
    if (pivotRef.current && contentMeshRef.current && lineRef.current) {
      const pivotWorldPos = new THREE.Vector3();
      const contentWorldPos = new THREE.Vector3();

      pivotRef.current.getWorldPosition(pivotWorldPos);
      contentMeshRef.current.getWorldPosition(contentWorldPos);

      positions.current[0] = pivotWorldPos.x;
      positions.current[1] = pivotWorldPos.y;
      positions.current[2] = pivotWorldPos.z;
      positions.current[3] = contentWorldPos.x;
      positions.current[4] = contentWorldPos.y;
      positions.current[5] = contentWorldPos.z;

      const positionAttribute = lineRef.current.geometry.attributes.position;
      positionAttribute.array.set(positions.current);
      positionAttribute.needsUpdate = true;
      lineRef.current.geometry.computeBoundingSphere();
    }
  });

  return (
    <group>
      <DragControls onDrag={handlePivotDrag}>
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

      <DragControls
        dragConfig={{ enabled: !isEditing }}
        onDrag={handleContentDrag}
      >
        <Billboard
          ref={contentMeshRef}
          position={contentPositionRef.current as [number, number, number]}
        >
          <mesh>
            <Root
              hover={{ backgroundOpacity: 0.8 }}
              padding={4}
              borderRadius={4}
            >
              {isImage ? (
                <>
                  <Image
                    src={content || "https://via.placeholder.com/150"}
                    width={150}
                    height={150}
                    objectFit="cover"
                  />
                  <Text
                    onClick={onDelete}
                    color="red"
                    fontSize={32}
                    positionType="relative"
                    marginTop={-100}
                    marginLeft={20}
                    fontWeight={"bold"}
                  >
                    Delete
                  </Text>
                </>
              ) : isEditing ? (
                <>
                  <Input
                    value={content}
                    onValueChange={(value: string) => {
                      setContent(value);
                      contentRef.current = value;
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
                    {content || "Annotation"}
                  </Text>
                  <Text
                    onClick={() => setIsEditing(true)}
                    color="orange"
                    fontSize={32}
                    positionType="relative"
                    marginTop={-30}
                    marginLeft={20}
                    fontWeight={"bold"}
                  >
                    Edit
                  </Text>
                  <Text
                    onClick={onDelete}
                    color="red"
                    fontSize={32}
                    positionType="relative"
                    marginTop={-30}
                    marginLeft={20}
                    fontWeight={"bold"}
                  >
                    Delete
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
  const [modelColor, setModelColor] = useState<string>("cyan");
  const annotationsRef = useRef<
    {
      positionRef: RefObject<number[]>;
      contentRef: RefObject<string>;
      modelRef: RefObject<THREE.Group>;
      isImage: boolean;
    }[]
  >([]);
  const cameraRef = useRef<THREE.Camera>(null);
  const originalCameraPosition = useRef(new THREE.Vector3(0, 0, 20));
  const [modelLoaded, setModelLoaded] = useState(false);
  const [showSelectionPanel, setShowSelectionPanel] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<THREE.Vector3 | null>(null);
  const [pendingModelRef, setPendingModelRef] =
    useState<RefObject<THREE.Group> | null>(null);
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
    setPendingPoint(point);
    setPendingModelRef(modelRef);
    setShowSelectionPanel(true);
  };

  const handleTextSelection = () => {
    if (!pendingPoint || !pendingModelRef) return;
    annotationsRef.current.push({
      positionRef: {
        current: [pendingPoint.x, pendingPoint.y, pendingPoint.z],
      },
      contentRef: { current: "Annotation" },
      modelRef: pendingModelRef,
      isImage: false,
    });
    setAnnotationCount(annotationsRef.current.length);
    setShowSelectionPanel(false);
    setPendingPoint(null);
    setPendingModelRef(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && pendingModelRef && pendingPoint) {
      const url = URL.createObjectURL(file);
      annotationsRef.current.push({
        positionRef: {
          current: [pendingPoint.x, pendingPoint.y, pendingPoint.z],
        },
        contentRef: { current: url },
        modelRef: pendingModelRef,
        isImage: true,
      });
      setAnnotationCount(annotationsRef.current.length);
      setShowSelectionPanel(false);
      setPendingPoint(null);
      setPendingModelRef(null);
    }
  };

  const handleDelete = (index: number) => {
    annotationsRef.current.splice(index, 1);
    setAnnotationCount(annotationsRef.current.length);
  };

  const handleTypeChange = (
    index: number,
    isImage: boolean,
    newContent?: string
  ) => {
    annotationsRef.current[index].isImage = isImage;
    annotationsRef.current[index].contentRef.current =
      newContent || (isImage ? null : "Annotation");
    setAnnotationCount(annotationsRef.current.length); // Force re-render
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
      {showSelectionPanel && (
        <div
          style={{
            position: "absolute",
            zIndex: 2,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            textAlign: "center",
          }}
        >
          <h3 style={{ marginBottom: "15px" }}>Add Annotation</h3>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            <button
              onClick={handleTextSelection}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Add Text
            </button>
            <label
              style={{
                padding: "10px 20px",
                backgroundColor: "#2196F3",
                color: "white",
                borderRadius: "4px",
                cursor: "pointer",
                display: "inline-block",
              }}
            >
              Add Image
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: "none" }}
              />
            </label>
            <button
              onClick={() => setShowSelectionPanel(false)}
              style={{
                padding: "10px 20px",
                backgroundColor: "#ff4444",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
                color={modelColor}
              />
            )}
          </Suspense>
          {annotationsRef.current.map((annotation, index) => (
            <Suspense key={index} fallback={null}>
              <Annotation
                positionRef={annotation.positionRef}
                contentRef={annotation.contentRef}
                modelRef={annotation.modelRef}
                isImage={annotation.isImage}
                onDelete={() => handleDelete(index)}
                onTypeChange={(isImage, newContent) =>
                  handleTypeChange(index, isImage, newContent)
                }
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
