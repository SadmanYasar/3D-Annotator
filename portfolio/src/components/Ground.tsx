import { RigidBody } from '@react-three/rapier';
// import { editable as e } from '@theatre/r3f'

export default function Ground() {

    return (
        // <RigidBody type="fixed" colliders="trimesh" ccd>
        //     <Plane args={[100, 100]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        //         <meshStandardMaterial color={'#888888'} />
        //     </Plane>
        // </RigidBody>
        // <RigidBody type="fixed" ccd>
        //     <mesh position={[0, -0.5, 0]}>
        //         <boxGeometry args={[20, 50, 20]} />
        //         <meshStandardMaterial color={"blue"} />
        //     </mesh>
        // </RigidBody>
        <RigidBody type="fixed" ccd>
            <mesh receiveShadow position={[0, -5.3, 0]}>
                <boxGeometry args={[300, 10, 300]} />
                <meshPhongMaterial color="#ff0000" opacity={0} transparent />
            </mesh>

            {/* <e.mesh theatreKey="Plane About" castShadow receiveShadow position={[10, -5.3, 0]}>
                <boxGeometry args={[10, 10, 10]} />
                <meshPhongMaterial color="#ff0000" opacity={0.1} transparent />
            </e.mesh>

            <e.mesh theatreKey="Plane Contact" castShadow receiveShadow position={[-10, -5.3, 0]}>
                <boxGeometry args={[10, 10, 10]} />
                <meshPhongMaterial color="#ff0000" opacity={0} transparent />
            </e.mesh>

            <e.mesh theatreKey="Plane Projects" castShadow receiveShadow position={[10, -5.3, 10]}>
                <boxGeometry args={[10, 10, 10]} />
                <meshPhongMaterial color="#ff0000" opacity={0} transparent />
            </e.mesh> */}
        </RigidBody>
    );
}