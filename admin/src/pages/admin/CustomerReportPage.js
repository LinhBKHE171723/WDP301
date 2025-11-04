import React from 'react';
// 1. Import hook `useParams` từ react-router-dom
import { useParams } from 'react-router-dom';
import  CustomerReport  from "../../components/admin/CustomerReport";

export default function CustomerReportPage() {

    return (
        <div className="space-y-6">
            <CustomerReport  />
        </div>
    );
}
