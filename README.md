# CRUD_facility_mapping_catalogue_frontend

Example of a CRUD facility, used for ServESS system mapping catalogue handling. 
Includes create, read, update, delete, sorting, filtering and Excel export functions.
ABAP codebase is based on RTTS (Runtime Type Services) to support any custom table maintenance: inherit from ZCL_CATALOGUE_BASE and set custom table name, GUID field and GUID type in constructor.

Example:

    super->constructor(
      ip_catalogue_guid_type = 'NUMC4'
      ip_catalogue_table = 'ZSERVESSRULESMAP'
      ip_catalogue_guid_field = 'RECORDID'
      ).
      
Demo is available in /demo folder.
