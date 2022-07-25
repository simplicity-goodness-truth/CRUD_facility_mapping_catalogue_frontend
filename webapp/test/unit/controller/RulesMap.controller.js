/*global QUnit*/

sap.ui.define([
	"zrulesmap/rulesmapping/controller/RulesMap.controller"
], function (Controller) {
	"use strict";

	QUnit.module("RulesMap Controller");

	QUnit.test("I should test the RulesMap controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
