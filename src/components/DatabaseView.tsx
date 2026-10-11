interface FieldDef {
  name: string;
  type: string;
  pk?: boolean;
  fk?: boolean;
  unique?: boolean;
  indexed?: boolean;
  geo?: boolean;
  nullable?: boolean;
}

interface ModelDef {
  name: string;
  table: string;
  module: string;
  fields: FieldDef[];
}

export function DatabaseView() {
  const models: ModelDef[] = [
    {
      name: 'User', table: 'users', module: 'M1: Auth',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'email', type: 'String(255)', unique: true, indexed: true },
        { name: 'hashed_password', type: 'String(255)' },
        { name: 'first_name', type: 'String(100)' },
        { name: 'last_name', type: 'String(100)' },
        { name: 'phone', type: 'String(20)', nullable: true },
        { name: 'role', type: 'Enum(UserRole)' },
        { name: 'is_active', type: 'Boolean' },
        { name: 'organization_id', type: 'UUID → organizations', fk: true },
        { name: 'last_login', type: 'DateTime(tz)', nullable: true },
        { name: 'password_reset_token', type: 'String(255)', nullable: true },
        { name: 'created_at', type: 'DateTime(tz)' },
      ],
    },
    {
      name: 'Organization', table: 'organizations', module: 'M1: Auth',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'name', type: 'String(255)' },
        { name: 'legal_name', type: 'String(500)', nullable: true },
        { name: 'tax_id', type: 'String(20)', unique: true },
        { name: 'total_area_ha', type: 'Float', indexed: true },
        { name: 'is_active', type: 'Boolean' },
        { name: 'created_at', type: 'DateTime(tz)' },
      ],
    },
    {
      name: 'AuthAuditLog', table: 'auth_audit_logs', module: 'M1: Auth',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'user_id', type: 'UUID → users', fk: true, nullable: true },
        { name: 'event_type', type: 'String(50)' },
        { name: 'ip_address', type: 'String(45)', nullable: true },
        { name: 'user_agent', type: 'String(500)', nullable: true },
        { name: 'success', type: 'Boolean' },
        { name: 'details', type: 'Text', nullable: true },
        { name: 'created_at', type: 'DateTime(tz)' },
      ],
    },
    {
      name: 'Field', table: 'fields', module: 'M2: Fields',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'organization_id', type: 'UUID → organizations', fk: true, indexed: true },
        { name: 'name', type: 'String(255)', indexed: true },
        { name: 'cadastral_number', type: 'String(50)', nullable: true },
        { name: 'geometry', type: 'POLYGON (PostGIS, 4326)', geo: true },
        { name: 'centroid', type: 'POINT (PostGIS, 4326)', geo: true },
        { name: 'area_ha', type: 'Float' },
        { name: 'region', type: 'String(100)', nullable: true },
        { name: 'district', type: 'String(100)', nullable: true },
        { name: 'soil_type', type: 'Enum(SoilType)', nullable: true },
        { name: 'ph_level', type: 'Float', nullable: true },
        { name: 'humus_percent', type: 'Float', nullable: true },
        { name: 'is_active', type: 'Boolean' },
        { name: 'created_at', type: 'DateTime(tz)' },
      ],
    },
    {
      name: 'FieldHistory', table: 'field_history', module: 'M2: Fields',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'field_id', type: 'UUID → fields', fk: true, indexed: true },
        { name: 'year', type: 'Integer' },
        { name: 'crop_type', type: 'String(100)', nullable: true },
        { name: 'variety', type: 'String(200)', nullable: true },
        { name: 'yield_tons_per_ha', type: 'Float', nullable: true },
        { name: 'total_yield_tons', type: 'Float', nullable: true },
        { name: 'fertilizers_used', type: 'JSONB', nullable: true },
        { name: 'pesticides_used', type: 'JSONB', nullable: true },
        { name: 'notes', type: 'Text', nullable: true },
      ],
    },
    {
      name: 'FieldCropRotation', table: 'field_crop_rotations', module: 'M2: Fields',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'field_id', type: 'UUID → fields', fk: true },
        { name: 'year', type: 'Integer' },
        { name: 'planned_crop', type: 'String(100)' },
        { name: 'planned_variety', type: 'String(200)', nullable: true },
        { name: 'expected_yield_tons_per_ha', type: 'Float', nullable: true },
        { name: 'is_valid_rotation', type: 'Boolean' },
      ],
    },
    {
      name: 'Warehouse', table: 'warehouses', module: 'M3: Inventory',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'organization_id', type: 'UUID → organizations', fk: true },
        { name: 'name', type: 'String(255)' },
        { name: 'type', type: 'Enum(WarehouseType)' },
        { name: 'location', type: 'POINT (PostGIS)', geo: true, nullable: true },
        { name: 'is_active', type: 'Boolean' },
      ],
    },
    {
      name: 'Material', table: 'materials', module: 'M3: Inventory',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'organization_id', type: 'UUID → organizations', fk: true },
        { name: 'sku', type: 'String(50)', unique: true, indexed: true },
        { name: 'name', type: 'String(255)', indexed: true },
        { name: 'category', type: 'Enum(MaterialCategory)', indexed: true },
        { name: 'unit', type: 'String(20)' },
        { name: 'active_ingredient', type: 'String(255)', nullable: true },
        { name: 'min_stock', type: 'Float' },
        { name: 'max_stock', type: 'Float' },
        { name: 'cost_per_unit', type: 'Float' },
        { name: 'is_active', type: 'Boolean' },
      ],
    },
    {
      name: 'StockMovement', table: 'stock_movements', module: 'M3: Inventory',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'material_id', type: 'UUID → materials', fk: true, indexed: true },
        { name: 'warehouse_id', type: 'UUID → warehouses', fk: true, indexed: true },
        { name: 'movement_type', type: 'Enum(IN/OUT/TRANSFER)' },
        { name: 'quantity', type: 'Float' },
        { name: 'unit_cost', type: 'Float' },
        { name: 'total_cost', type: 'Float' },
        { name: 'reference_type', type: 'String(50)', nullable: true },
        { name: 'reference_id', type: 'UUID', nullable: true },
        { name: 'performed_by_id', type: 'UUID → users', fk: true },
        { name: 'batch_number', type: 'String(100)', nullable: true },
        { name: 'expiry_date', type: 'DateTime(tz)', nullable: true },
        { name: 'performed_at', type: 'DateTime(tz)' },
      ],
    },
    {
      name: 'Stock', table: 'stock', module: 'M3: Inventory',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'warehouse_id', type: 'UUID → warehouses', fk: true },
        { name: 'material_id', type: 'UUID → materials', fk: true },
        { name: 'quantity', type: 'Float' },
      ],
    },
    {
      name: 'FieldOperation', table: 'operations', module: 'M4: Operations',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'field_id', type: 'UUID → fields', fk: true, indexed: true },
        { name: 'organization_id', type: 'UUID → organizations', fk: true },
        { name: 'operation_type', type: 'Enum(OperationType)', indexed: true },
        { name: 'status', type: 'Enum(OperationStatus)' },
        { name: 'title', type: 'String(255)' },
        { name: 'planned_date', type: 'Date' },
        { name: 'actual_date', type: 'DateTime(tz)', nullable: true },
        { name: 'area_ha', type: 'Float', nullable: true },
        { name: 'assigned_to_id', type: 'UUID → users', fk: true, nullable: true },
        { name: 'executor_id', type: 'UUID → users', fk: true, nullable: true },
        { name: 'materials_used', type: 'JSONB', nullable: true },
        { name: 'machinery_used', type: 'JSONB', nullable: true },
        { name: 'fuel_consumed_liters', type: 'Float', nullable: true },
        { name: 'fuel_consumed_per_ha', type: 'Float', nullable: true },
        { name: 'duration_hours', type: 'Float', nullable: true },
        { name: 'photos', type: 'ARRAY(String)', nullable: true },
        { name: 'created_by', type: 'UUID → users', fk: true },
        { name: 'verified_by', type: 'UUID → users', fk: true, nullable: true },
      ],
    },
    {
      name: 'Machinery', table: 'machinery', module: 'M4: Operations',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'organization_id', type: 'UUID → organizations', fk: true },
        { name: 'name', type: 'String(255)' },
        { name: 'type', type: 'String(50)' },
        { name: 'brand', type: 'String(100)', nullable: true },
        { name: 'model', type: 'String(100)', nullable: true },
        { name: 'license_plate', type: 'String(20)', unique: true },
        { name: 'fuel_tank_capacity', type: 'Float', nullable: true },
        { name: 'fuel_consumption_per_ha', type: 'Float', nullable: true },
        { name: 'gps_tracker_id', type: 'String(100)', nullable: true },
        { name: 'is_active', type: 'Boolean' },
      ],
    },
    {
      name: 'Company', table: 'companies', module: 'M5: CRM',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'organization_id', type: 'UUID → organizations', fk: true },
        { name: 'name', type: 'String(255)', indexed: true },
        { name: 'type', type: 'Enum(CompanyType)' },
        { name: 'tax_id', type: 'String(20)', nullable: true },
        { name: 'legal_address', type: 'Text', nullable: true },
        { name: 'reliability_score', type: 'Float', nullable: true },
        { name: 'created_at', type: 'DateTime(tz)' },
      ],
    },
    {
      name: 'Contact', table: 'contacts', module: 'M5: CRM',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'organization_id', type: 'UUID → organizations', fk: true },
        { name: 'company_id', type: 'UUID → companies', fk: true, nullable: true },
        { name: 'first_name', type: 'String(100)' },
        { name: 'last_name', type: 'String(100)' },
        { name: 'position', type: 'String(100)', nullable: true },
        { name: 'email', type: 'String(255)', nullable: true },
        { name: 'phone', type: 'String(20)', nullable: true },
      ],
    },
    {
      name: 'Deal', table: 'deals', module: 'M5: CRM',
      fields: [
        { name: 'id', type: 'UUID', pk: true },
        { name: 'organization_id', type: 'UUID → organizations', fk: true },
        { name: 'title', type: 'String(255)' },
        { name: 'company_id', type: 'UUID → companies', fk: true, nullable: true },
        { name: 'contact_id', type: 'UUID → contacts', fk: true, nullable: true },
        { name: 'deal_type', type: 'Enum(DealType)' },
        { name: 'status', type: 'Enum(DealStatus)' },
        { name: 'value', type: 'Float' },
        { name: 'currency', type: 'String(3)' },
        { name: 'expected_close_date', type: 'Date', nullable: true },
        { name: 'crop_type', type: 'String(100)', nullable: true },
        { name: 'quantity_tons', type: 'Float', nullable: true },
        { name: 'price_per_ton', type: 'Float', nullable: true },
        { name: 'stage_history', type: 'JSONB', nullable: true },
        { name: 'created_at', type: 'DateTime(tz)' },
      ],
    },
  ];

  const relationships = [
    { from: 'Organization', to: 'User', type: '1:N' },
    { from: 'Organization', to: 'Field', type: '1:N' },
    { from: 'Organization', to: 'Warehouse', type: '1:N' },
    { from: 'Organization', to: 'Material', type: '1:N' },
    { from: 'Organization', to: 'FieldOperation', type: '1:N' },
    { from: 'Organization', to: 'Company', type: '1:N' },
    { from: 'Field', to: 'FieldHistory', type: '1:N' },
    { from: 'Field', to: 'FieldCropRotation', type: '1:N' },
    { from: 'Field', to: 'FieldOperation', type: '1:N' },
    { from: 'Warehouse', to: 'Stock', type: '1:N' },
    { from: 'Warehouse', to: 'StockMovement', type: '1:N' },
    { from: 'Material', to: 'Stock', type: '1:N' },
    { from: 'Material', to: 'StockMovement', type: '1:N' },
    { from: 'Company', to: 'Contact', type: '1:N' },
    { from: 'Company', to: 'Deal', type: '1:N' },
    { from: 'Contact', to: 'Deal', type: '1:N' },
  ];

  const moduleColors: Record<string, string> = {
    'M1: Auth': 'border-purple-500/30 bg-purple-500/5',
    'M2: Fields': 'border-green-500/30 bg-green-500/5',
    'M3: Inventory': 'border-blue-500/30 bg-blue-500/5',
    'M4: Operations': 'border-orange-500/30 bg-orange-500/5',
    'M5: CRM': 'border-pink-500/30 bg-pink-500/5',
  };

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Схема базы данных</h1>
      <p className="text-gray-400 mb-8">PostgreSQL 15 + PostGIS 3.x — 15 моделей, пространственные данные</p>

      {/* Relationships */}
      <div className="mb-10">
        <h2 className="text-lg font-semibold text-white mb-4">Связи между сущностями</h2>
        <div className="flex flex-wrap gap-2">
          {relationships.map((rel, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs">
              <span className="text-blue-400 font-mono">{rel.from}</span>
              <span className="text-gray-600">→</span>
              <span className="text-green-400 font-mono">{rel.to}</span>
              <span className="text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">{rel.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Models grouped by module */}
      {['M1: Auth', 'M2: Fields', 'M3: Inventory', 'M4: Operations', 'M5: CRM'].map(moduleName => {
        const moduleModels = models.filter(m => m.module === moduleName);
        if (moduleModels.length === 0) return null;
        return (
          <div key={moduleName} className="mb-8">
            <h2 className={`text-sm font-semibold mb-3 px-3 py-1.5 rounded-lg inline-block ${moduleColors[moduleName]}`}>
              {moduleName}
            </h2>
            <div className="space-y-3">
              {moduleModels.map((model) => (
                <div key={model.name} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-white">{model.name}</h3>
                      <code className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">{model.table}</code>
                    </div>
                    <span className="text-xs text-gray-500">{model.fields.length} columns</span>
                  </div>
                  <div className="divide-y divide-gray-800/50">
                    {model.fields.map((field, i) => (
                      <div key={i} className="px-4 py-2 flex items-center gap-4 text-sm hover:bg-gray-800/30">
                        <span className={`font-mono w-48 truncate ${field.pk ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {field.pk && '🔑 '}{field.name}
                        </span>
                        <span className="text-gray-500 font-mono text-xs flex-1">{field.type}</span>
                        <div className="flex gap-1.5">
                          {field.pk && <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/20">PK</span>}
                          {field.fk && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">FK</span>}
                          {field.unique && <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">UQ</span>}
                          {field.indexed && <span className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded border border-green-500/20">IDX</span>}
                          {field.geo && <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20">GIS</span>}
                          {field.nullable && <span className="text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">NULL</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
