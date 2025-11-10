"use client";
import React from "react";
import styled from "styled-components";

const Loader = ({ message }: { message: string }) => {
  return (
    <StyledWrapper>
      <div className="flex flex-col justify-center items-center ">
        <div className="loader">
          <div className="cell d-0" />
          <div className="cell d-1" />
          <div className="cell d-2" />
          <div className="cell d-1" />
          <div className="cell d-2" />
          <div className="cell d-2" />
          <div className="cell d-3" />
          <div className="cell d-3" />
          <div className="cell d-4" />
        </div>
        <div className="message animate-pulse ">{message}</div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .loader {
    --cell-size: 28px;
    --cell-spacing: 1px;
    --cells: 3;
    --total-size: calc(
      var(--cells) * (var(--cell-size) + 2 * var(--cell-spacing))
    );
    display: flex;
    flex-wrap: wrap;
    width: var(--total-size);
    height: var(--total-size);
  }

  .cell {
    flex: 0 0 var(--cell-size);
    margin: var(--cell-spacing);
    background-color: transparent;
    box-sizing: border-box;
    border-radius: 4px;
    animation: 1.5s ripple ease infinite;
  }

  .cell.d-1 {
    animation-delay: 100ms;
  }

  .cell.d-2 {
    animation-delay: 200ms;
  }

  .cell.d-3 {
    animation-delay: 300ms;
  }

  .cell.d-4 {
    animation-delay: 400ms;
  }

  .cell:nth-child(1) {
    --cell-color: #00ff87;
  }

  .cell:nth-child(2) {
    --cell-color: #0cfd95;
  }

  .cell:nth-child(3) {
    --cell-color: #17fba2;
  }

  .cell:nth-child(4) {
    --cell-color: #23f9b2;
  }

  .cell:nth-child(5) {
    --cell-color: #30f7c3;
  }

  .cell:nth-child(6) {
    --cell-color: #3df5d4;
  }

  .cell:nth-child(7) {
    --cell-color: #45f4de;
  }

  .cell:nth-child(8) {
    --cell-color: #53f1f0;
  }

  .cell:nth-child(9) {
    --cell-color: #60efff;
  }
  .message {
    margin-top: 16px;

    font-size: 1.2rem;
  }

  /*Animation*/
  @keyframes ripple {
    0% {
      background-color: transparent;
    }

    30% {
      background-color: var(--cell-color);
    }

    60% {
      background-color: transparent;
    }

    100% {
      background-color: transparent;
    }
  }

`;
 
// const StyledWrapper = styled.div`
//   .loader {
//     --cell-size: 28px;
//     --cell-spacing: 1px;
//     --cells: 3;
//     --total-size: calc(
//       var(--cells) * (var(--cell-size) + 2 * var(--cell-spacing))
//     );
//     display: flex;
//     flex-wrap: wrap;
//     width: var(--total-size);
//     height: var(--total-size);
//     gap: var(--cell-spacing);
//     transform: translateZ(0); /* promote to its own layer */
//   }

//   .cell {
//     flex: 0 0 var(--cell-size);
//     width: var(--cell-size);
//     height: var(--cell-size);
//     margin: var(--cell-spacing);
//     border-radius: 4px;
//     background-color: var(--cell-color, #60efff);
//     /* Use transform & opacity for animation -> GPU accelerated */
//     transform: scale(0.75);
//     opacity: 0.3;
//     will-change: transform, opacity;
//     animation: pop 900ms cubic-bezier(.2,.8,.2,1) infinite;
//   }

//   /* stagger via animation-delay */
//   .cell.d-1 { animation-delay: 80ms; }
//   .cell.d-2 { animation-delay: 160ms; }
//   .cell.d-3 { animation-delay: 240ms; }
//   .cell.d-4 { animation-delay: 320ms; }

//   /* colors (same mapping) */
//   .cell:nth-child(1) { --cell-color: #00ff87; }
//   .cell:nth-child(2) { --cell-color: #0cfd95; }
//   .cell:nth-child(3) { --cell-color: #17fba2; }
//   .cell:nth-child(4) { --cell-color: #23f9b2; }
//   .cell:nth-child(5) { --cell-color: #30f7c3; }
//   .cell:nth-child(6) { --cell-color: #3df5d4; }
//   .cell:nth-child(7) { --cell-color: #45f4de; }
//   .cell:nth-child(8) { --cell-color: #53f1f0; }
//   .cell:nth-child(9) { --cell-color: #60efff; }

//   .message {
//     margin-top: 12px;
//     font-size: 1.05rem;
//     opacity: 0.95;
//   }

//   @keyframes pop {
//     0% {
//       transform: scale(0.75);
//       opacity: 0.25;
//     }
//     35% {
//       transform: scale(1.05);
//       opacity: 1;
//     }
//     70% {
//       transform: scale(0.9);
//       opacity: 0.6;
//     }
//     100% {
//       transform: scale(0.75);
//       opacity: 0.25;
//     }
//   }

//   /* Respect reduced motion */
//   @media (prefers-reduced-motion: reduce) {
//     .cell { animation: none; transform: scale(1); opacity: 1; }
//   }
// `;

export default Loader;
