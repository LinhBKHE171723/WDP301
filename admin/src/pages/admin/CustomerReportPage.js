import React from 'react';

import { useParams } from 'react-router-dom';
import  CustomerReport  from "../../components/admin/CustomerReport";

export default function CustomerReportPage() {

    return (
        <div className="space-y-6">
            <CustomerReport  />
        </div>
    );
}
