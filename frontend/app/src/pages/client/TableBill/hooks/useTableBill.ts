import { useEffect, useRef, useState } from "react";
import { mockTableBill } from "../mocks/tableBill.mocks";

import type { BillClosingOption, TableBillProps } from "../types/tableBill.types";

export function useTableBill(
    bill = mockTableBill, 
    onNavigate: TableBillProps["onNavigate"]
) {
    const [closingOption, setClosingOption] = useState<BillClosingOption>("cashier");
    const [closureRequested, setClosureRequested] = useState(false);
    const feedbackRef = useRef<HTMLDivElement>(null);
    const isClosed = bill.status === "closed";
    const totalInCents = bill.orders.reduce((total, order) => total + order.amountInCents, bill.serviceInCents);

    useEffect(() => {
        if (closureRequested) {
        feedbackRef.current?.scrollIntoView({ block: "nearest" });
        }
    }, [closureRequested]);

    function handleNavigate(destination: string) {
        onNavigate?.(destination);
    }

    function handleRequestClose() {
        if (isClosed || closureRequested) return;
        // Apenas confirmação visual. A integração com o backend será feita aqui depois.
        setClosureRequested(true);
    }

    return {
        closingOption,
        setClosingOption,
        isClosed,
        totalInCents,
        handleNavigate,
        handleRequestClose,
        closureRequested,
        feedbackRef
    }
}