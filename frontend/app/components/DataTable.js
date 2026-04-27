import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';

const CustomDataTable = ({ data, loading = false, columns }) => (
    <DataTable value={data} loading={loading} rows={10} rowsPerPageOptions={[10, 20, 30]} paginator>
        {columns.map((col, index) => (
            <Column key={index} field={col.field} header={col.header} filter={col.filter} body={col.body} style={col.style} />
        ))}
    </DataTable>
);

export default CustomDataTable;
