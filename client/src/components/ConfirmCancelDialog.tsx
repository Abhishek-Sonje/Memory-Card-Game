"use client";

import React from "react";
import { toast } from "react-hot-toast";

const ConfirmCancelDialog = ({ t, onConfirm, onCancel }:{t: any, onConfirm: () => void, onCancel: () => void}) => (
  <div className="flex flex-col gap-2">
    <p className="font-semibold">Cancel this game?</p>
    <p className="text-sm text-gray-600">
      This will end the session for all players.
    </p>
    <div className="flex gap-2 mt-2">
      <button
        onClick={() => {
          onConfirm();
          toast.dismiss(t.id);
        }}
        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
      >
        Yes, Cancel
      </button>
      <button
        onClick={() => toast.dismiss(t.id)}
        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
      >
        No, Keep Playing
      </button>
    </div>
  </div>
);

export default ConfirmCancelDialog;
