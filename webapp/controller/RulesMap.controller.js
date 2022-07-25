sap.ui.define([
        "sap/ui/core/mvc/Controller",
        'sap/ui/model/odata/v2/ODataModel',
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast"
    ],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, ODataModel, JSONModel, MessageToast) {
        "use strict";

        return Controller.extend("zrulesmap.controller.RulesMap", {
            onInit: function () {

                var oRuntimeModel,
                    t;

                // Setting OData model to view        

                this.setViewODataModel();

                // Setting a JSON model for application runtime

                oRuntimeModel = new JSONModel({
                    editModeActive: false,
                    amountOfRowsSelected: 0,
                    amountOfFieldsChanged: 0
                });

                this.getOwnerComponent().setModel(oRuntimeModel, "runtimeModel");

                // Extra listener for row selection event   

                t = this;

                this.byId("rulesSmartTable").getTable().attachRowSelectionChange(function (oEvent) {

                    t.handleRowPress();

                });


                // Array of table changes

                this.arrayOfTableChanges = [];

            }, // onInit: function ()

            handleRowPress: function () {

                // Getting amount of selected rows and setting it to model

                var iSelectedRows = this.calculateSelectedRows(),
                    oRuntimeModel = this.getOwnerComponent().getModel("runtimeModel");

                oRuntimeModel.setProperty("/amountOfRowsSelected", iSelectedRows);

            },


            setViewODataModel() {

                var sServiceUrl,
                    oView,
                    OViewODataModel;

                // Setting OData model to view            

                sServiceUrl = this.getOwnerComponent().getManifestEntry("/sap.app/dataSources/mainService/uri");

                OViewODataModel = new ODataModel(sServiceUrl, {
                    defaultCountMode: "Inline"

                });

                OViewODataModel.setDefaultBindingMode("TwoWay");

                oView = this.getView();

                oView.setModel(OViewODataModel);

            },

            calculateSelectedRows: function () {

                var oSmartTable = this.byId("rulesSmartTable").getTable(),

                    oSmartTableSelectedIndicies = oSmartTable.getSelectedIndices(); // Numbers of selected rows starting from 0

                return oSmartTableSelectedIndicies.length;

            },

            onBeforeExport: function (oEvt) {
                var mExcelSettings = oEvt.getParameter("exportSettings");

                if (mExcelSettings.url) {
                    return;
                }
                mExcelSettings.worker = false;
            },
            // onPressSort: function () {
            //     var oSmartTable = this.getSmartTable();
            //     if (oSmartTable) {
            //         oSmartTable.openPersonalisationDialog("Sort");
            //     }
            // },
            getSmartTable: function () {
                if (!this.SmartTable) {
                    this.oSmartTable = this.getView().byId("rulesSmartTable");
                }
                return this.oSmartTable;
            },
            onPressAddRule: function () {

                this.openCreateRecordFragment();
            },

            onCloseCreateRecordFragment: function () {

                this.oCreateRecordFragment.destroy(true);
            },

            openCreateRecordFragment: function () {

                this.oCreateRecordFragment = sap.ui.xmlfragment("zrulesmap.view.CreateRecord", this);

                this.getView().addDependent(this.oCreateRecordFragment);

                this.oCreateRecordFragment.open();

            },

            isEditModeActive: function () {

                return this.getOwnerComponent().getModel("runtimeModel").getProperty("/editModeActive");

            },

            clearArrayOfChanges: function () {

                var oRuntimeModel = this.getOwnerComponent().getModel("runtimeModel");

                this.arrayOfTableChanges = [];

                oRuntimeModel.setProperty("/amountOfFieldsChanged", this.arrayOfTableChanges.length);

            },

            onSwitchEditReadMode: function () {

                var isEditModeActive = this.isEditModeActive(),
                    oRuntimeModel = this.getOwnerComponent().getModel("runtimeModel"),
                    oSmartTable = this.getSmartTable(),
                    arrayOfTableChangesLength = this.arrayOfTableChanges.length,
                    t = this;

                // Check if changed data should be saved 

                if (arrayOfTableChangesLength > 0) {

                    // Confirmation that data can be lost

                    sap.m.MessageBox.confirm(this.getTranslatedText("saveCancellationConfirmation"), {
                        title: this.getTranslatedText("saveCancellation"),
                        actions: [
                            sap.m.MessageBox.Action.OK,
                            sap.m.MessageBox.Action.CANCEL
                        ],
                        onClose: function (actionSelected) {

                            switch (actionSelected) {
                                case 'OK':

                                    t.setViewODataModel();

                                    t.clearArrayOfChanges();

                                    t.onRefreshSmartTable();

                                    oRuntimeModel.setProperty("/editModeActive", !isEditModeActive);

                                    break;

                                case 'CANCEL':

                                    // Setting table to editable mode again

                                    oSmartTable.setEditable(true);
                                    oRuntimeModel.setProperty("/editModeActive", true);

                                    return;

                            } // switch (actionSelected)

                        } // onClose: function (actionSelected)

                    }); // sap.m.MessageBox.confirm(this.getTranslatedText("deletionOfRecord")

                } else {


                    if (!isEditModeActive) {

                        MessageToast.show(t.getTranslatedText("changesSaveHint"));

                    }

                    oRuntimeModel.setProperty("/editModeActive", !isEditModeActive);

                    // Additional hint about ENTER pressing after change


                } // if (arrayOfTableChangesLength > 0)

            }, // onSwitchEditReadMode: function ()

            onCreateRecord: function () {

                // Validating and getting mandatory fields data

                var mandatoryFieldsAndCorrespondingODataProperties = {
                        subSystemInput: 'SubSystem',
                        titleInput: 'Title',
                        ruleIdInput: 'RuleID'
                    },
                    mandatoryFields = Object.keys(mandatoryFieldsAndCorrespondingODataProperties),
                    mandatoryFieldsValues,
                    oPayload = {},
                    t = this;

                mandatoryFieldsValues = this.validateAndGetCreationMandatoryFields(mandatoryFields);

                if (mandatoryFieldsValues) {

                    for (var key in mandatoryFields) {

                        oPayload[mandatoryFieldsAndCorrespondingODataProperties[mandatoryFields[key]]] =
                            mandatoryFieldsValues[mandatoryFields[key]];

                    }

                    this.executeRecordCreation(oPayload,
                        t.getTranslatedText("recordCreatedSuccessfully"),
                        t.getTranslatedText("recordCreationTechicalError"),
                        function (response) {

                            t.onCloseCreateRecordFragment();
                            t.onRefreshSmartTable();

                        });

                } // if (mandatoryFieldsValues)

            }, // onCreateRecord: function ()

            onRefreshSmartTable: function () {

                var oSmartTable = this.byId("rulesSmartTable");
                oSmartTable.rebindTable();
            },

            executeRecordCreation: function (oPayload, sSuccessfullExecution, sErroneousExecution, callback) {

                var sServiceUrl = this.getOwnerComponent().getManifestEntry("/sap.app/dataSources/mainService/uri"),
                    oServiceModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true),
                    creationPointer = "/RuleSet",
                    t = this;

                oServiceModel.create(creationPointer, oPayload, {

                    success: function () {

                        var d = sSuccessfullExecution;

                        sap.m.MessageBox.information(d);

                        return callback();

                    },
                    error: function (oError) {

                        var oMessage = sErroneousExecution + ':\n' +
                            JSON.parse(oError.response.body).error.message.value;

                        sap.m.MessageBox.error(oMessage);

                    }

                }); //  oServiceModel.create(creationPointer, oPayload
            }, //  executeRecordCreation: function (oPayload, sSuccessfullExecution, sErroneousExecution, callback)

            getTranslatedText: function (sTextId) {

                return this.getView().getModel("i18n").getResourceBundle().getText(sTextId);

            }, // getTranslatedText: function (sTextId)

            validateAndGetCreationMandatoryFields: function (mandatoryFields) {

                var mandatoryFieldsValues = {},
                    t = this;

                for (var key in mandatoryFields) {

                    var sFieldValue = this.getCreateRecordFragmentInputFieldValue(mandatoryFields[key]);

                    if (!sFieldValue) {

                        this.setFieldErrorState(mandatoryFields[key]);

                        MessageToast.show(t.getTranslatedText("mandatoryFieldsNotSet"));

                        return;

                    } else {

                        this.dropFieldState(mandatoryFields[key]);

                        mandatoryFieldsValues[mandatoryFields[key]] = sFieldValue;

                    } // if (!sFieldValue)

                } // for (var key in mandatoryFields)

                return mandatoryFieldsValues;

            }, // validateAndGetCreationMandatoryFields: function (mandatoryFields)

            getCreateRecordFragmentInputFieldValue: function (sFieldId) {

                return sap.ui.getCore().byId(sFieldId).getValue();

            }, // getCreateRecordFragmentInputFieldValue: function (sFieldId)

            setFieldErrorState: function (sFieldId) {

                sap.ui.getCore().byId(sFieldId).setValueState("Error");

            }, // setFieldErrorState: function (sFieldId)

            dropFieldState: function (sFieldId) {

                sap.ui.getCore().byId(sFieldId).setValueState("None");

            }, // dropFieldState: function (sFieldId)

            onFieldChange: function (oEvent) {

                var
                    pendingTableChanges = this.byId("rulesSmartTable").getTable().getModel().getPendingChanges(),
                    oPendingTableChange = {},
                    oRuntimeModel = this.getOwnerComponent().getModel("runtimeModel");

                for (var key in pendingTableChanges) {


                    oPendingTableChange[key] = pendingTableChanges[key];

                    this.arrayOfTableChanges.push(oPendingTableChange);

                    oRuntimeModel.setProperty("/amountOfFieldsChanged", this.arrayOfTableChanges.length);

                } // for (var key in pendingTableChanges)

            }, // onFieldChange: function (oEvent)

            onPressSave: function () {

                var t = this;

                sap.m.MessageBox.confirm(this.getTranslatedText("updateOfRecord"), {
                    title: this.getTranslatedText("updateConfirmation"),
                    actions: [
                        sap.m.MessageBox.Action.OK,
                        sap.m.MessageBox.Action.CANCEL
                    ],
                    onClose: function (actionSelected) {

                        switch (actionSelected) {
                            case 'OK':

                                t.saveRecord();

                                break;
                            case 'CANCEL':
                                break;
                        } // switch (actionSelected)

                    } // onClose: function (actionSelected)
                }); // sap.m.MessageBox.confirm(this.getTranslatedText("updateOfRecord")

            }, // onPressSave: function ()
 
            saveRecord: function () {

                var arrayOfTableChangesLength = this.arrayOfTableChanges.length,
                    arrayofTableChanges,
                    arrayofTableChangesKeys,
                    oUpdateStructure = [],
                    oUpdateStructurePayload = {},
                    oRuntimeModel = this.getOwnerComponent().getModel("runtimeModel"),
                    oSmartTable = this.getSmartTable(),
                    t = this;

                // Get the last record of array, as it contains all changes

                arrayofTableChanges = this.arrayOfTableChanges[arrayOfTableChangesLength - 1];

                arrayofTableChangesKeys = Object.keys(arrayofTableChanges);

                arrayofTableChanges = this.arrayOfTableChanges[arrayOfTableChangesLength - 1];

                // Transforming structure

                for (var i = 0; i < arrayofTableChangesKeys.length; i++) {

                    // var GUIDToUpdate = arrayofTableChangesKeys[i].match(/\(([^)]+)\)/)[1];

                    // Picking GUID

                    oUpdateStructurePayload['GUID'] = arrayofTableChangesKeys[i];

                    // Picking fields

                    for (var changedFieldName in arrayofTableChanges[arrayofTableChangesKeys[i]]) {

                        // Excluding _metadata field

                        if (changedFieldName.charAt(0) !== '_') {

                            var changedFieldValue = arrayofTableChanges[arrayofTableChangesKeys[i]][changedFieldName];

                            oUpdateStructurePayload[changedFieldName] = changedFieldValue;
                        } // if (changedFieldName.charAt(0) !== '_')                  

                    } // for (var changedFieldName in arrayofTableChanges[arrayofTableChangesKeys[i]] )

                    oUpdateStructure.push(oUpdateStructurePayload)

                    oUpdateStructurePayload = {};

                } // for (var i = 0; i < arrayofTableChangesKeys.length; i++)


                this.executeRecordUpdate(oUpdateStructure,
                    t.getTranslatedText("recordUpdatedSuccessfully"),
                    t.getTranslatedText("recordUpdateTechicalError"),
                    function (response) {

                        t.clearArrayOfChanges();

                        oSmartTable.setEditable(false);

                        oRuntimeModel.setProperty("/editModeActive", false);

                        t.onRefreshSmartTable();



                    });



            },



            executeRecordUpdate: function (oUpdateStructure, sSuccessfullExecution, sErroneousExecution, callback) {


                var sServiceUrl = this.getOwnerComponent().getManifestEntry("/sap.app/dataSources/mainService/uri"),
                    oServiceModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true),
                    updatePointer,
                    t = this,
                    amountOfRecordsToUpdate = oUpdateStructure.length,
                    amountOfUpdatedRecords = 0,
                    oPayload = {};

                for (var i = 0; i < oUpdateStructure.length; i++) {

                    updatePointer = oUpdateStructure[i].GUID;

                    oPayload = {};

                    for (var key in Object.keys(oUpdateStructure[i])) {

                        if (Object.keys(oUpdateStructure[i])[key] !== 'GUID') {

                            oPayload[Object.keys(oUpdateStructure[i])[key]] = oUpdateStructure[i][Object.keys(oUpdateStructure[i])[key]];
                        }

                    } // for (var key in Object.keys(oUpdateStructure[i]))


                    oServiceModel.update(updatePointer, oPayload, {

                        success: function () {

                            amountOfUpdatedRecords = amountOfUpdatedRecords + 1;

                            if (amountOfRecordsToUpdate === amountOfUpdatedRecords) {

                                var d = sSuccessfullExecution;

                                sap.m.MessageBox.information(d);

                                return callback();

                            } // if (amountOfRecordsToUpdate === amountOfUpdatedRecords)

                        },

                        error: function (oError) {

                            var oMessage = sErroneousExecution + ':\n' +
                                JSON.parse(oError.response.body).error.message.value;

                            sap.m.MessageBox.error(oMessage);

                        }

                    }); //  oServiceModel.update(updatePointer, oPayload

                } //  for (var i = 0; i < oUpdateStructure.length; i++)


            }, // executeRecordUpdate: function (oPayload, sSuccessfullExecution, sErroneousExecution, callback)


            onPressDelete: function () {

                var t = this;

                sap.m.MessageBox.confirm(this.getTranslatedText("deletionOfRecord"), {
                    title: this.getTranslatedText("deletionConfirmation"),
                    actions: [
                        sap.m.MessageBox.Action.DELETE,
                        sap.m.MessageBox.Action.CANCEL
                    ],
                    onClose: function (actionSelected) {

                        switch (actionSelected) {
                            case 'DELETE':

                                t.deleteRecord();

                                break;
                            case 'CANCEL':
                                break;
                        } // switch (actionSelected)

                    } // onClose: function (actionSelected)
                }); // sap.m.MessageBox.confirm(this.getTranslatedText("deletionOfRecord")

            }, // onPressDelete: function ()

            deleteRecord: function () {

                var oSmartTable = this.byId("rulesSmartTable").getTable(),
                    oSmartTableRows = oSmartTable.getBinding("rows").aKeys,
                    oSmartTableSelectedIndicies = oSmartTable.getSelectedIndices(),
                    oListOfGUIDsToDelete = [],
                    t = this; // Numbers of selected rows starting from 0

                for (var i of oSmartTableSelectedIndicies) {

                    var GUIDtoDelete = oSmartTableRows[i].match(/'(.*?)'/)[1];

                    oListOfGUIDsToDelete.push(GUIDtoDelete);

                } //for (var i of oSmartTableSelectedIndicies)

                this.executeRecordDeletion(oListOfGUIDsToDelete,
                    t.getTranslatedText("recordDeletedSuccessfully"),
                    t.getTranslatedText("recordDeletionTechicalError"),
                    function (response) {

                        t.onRefreshSmartTable();

                    });

            },

            executeRecordDeletion: function (oListOfGUIDsToDelete, sSuccessfullExecution, sErroneousExecution, callback) {

                var sServiceUrl = this.getOwnerComponent().getManifestEntry("/sap.app/dataSources/mainService/uri"),
                    oServiceModel = new sap.ui.model.odata.ODataModel(sServiceUrl, true),
                    deletionPointer,
                    t = this,
                    amountOfRecordsToDelete = oListOfGUIDsToDelete.length,
                    amountOfDeletedRecords = 0;

                for (var key in oListOfGUIDsToDelete) {

                    deletionPointer = "/RuleSet('" + oListOfGUIDsToDelete[key] + "')"

                    oServiceModel.remove(deletionPointer, {

                        success: function () {

                            amountOfDeletedRecords = amountOfDeletedRecords + 1;

                            if (amountOfRecordsToDelete === amountOfDeletedRecords) {

                                var d = sSuccessfullExecution;

                                sap.m.MessageBox.information(d);

                                return callback();

                            } // if (amountOfRecordsToDelete === amountOfDeletedRecords )

                        },

                        error: function (oError) {

                            var oMessage = sErroneousExecution + ':\n' +
                                JSON.parse(oError.response.body).error.message.value;

                            sap.m.MessageBox.error(oMessage);

                        }

                    }); //  oServiceModel.delete(deletionPointer

                } //  for (var key in oListOfGUIDsToDelete)

            } // executeRecordDeletion: function (oListOfGUIDsToDelete, sSuccessfullExecution, sErroneousExecution, callback)

        }); // return Controller.extend("zrulesmap.controller.RulesMap"

    }); // function (Controller, ODataModel, JSONModel, MessageToast)