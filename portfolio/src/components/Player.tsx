import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import CharacterModel from "./CharacterModel";
import Ecctrl, { EcctrlAnimation } from 'ecctrl'

export default function Player() {
    const ref = useRef<any>()

    const characterURL = "./sayem-animated.glb"

    const animationSet = {
        idle: 'Idle',
        walk: 'Walk',
        run: 'Running',
        jump: 'Jump_Start',
        jumpIdle: 'Falling_Idle',
        jumpLand: 'Jump_Land',
        fall: 'Falling_Idle'
    }

    const reset = () => {
        if (ref.current) {
            ref.current.setTranslation({ x: 24, y: 2, z: 3 })
            ref.current.setLinvel({ x: 0, y: 0, z: 0 })
            ref.current.setAngvel({ x: 0, y: 0, z: 0 })
        }
    }

    useFrame(() => {
        if (ref.current) {
            const position = (ref.current).translation()

            // Reset
            if (position.y < - 3) {
                reset()
            }
        }
    })

    return (
        <>
            <Ecctrl
                ref={ref}
                // debug
                animated
                // position={[26, -0.54, 1.54]}
                position={[24, -0.54, 3]}
                camInitDir={{ x: 0, y: -2.09, z: 0 }}
                autoBalance={false}
            >
                <EcctrlAnimation
                    characterURL={characterURL} // Must have property
                    animationSet={animationSet} // Must have property
                >
                    <CharacterModel />
                </EcctrlAnimation>
            </Ecctrl>
        </>
    )
}