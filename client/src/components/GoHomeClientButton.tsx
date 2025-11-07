"use client";

import { useRouter } from "next/navigation";
import { Button } from "./UI/button";

export default function GoHomeClientButton() {
    const router = useRouter();
    return (
       
            <Button variant={"outline"}>Go Home</Button>
        
    );
}