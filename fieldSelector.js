import { LightningElement, wire, api } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

export default class FieldSelector extends LightningElement {
    className = "slds-modal";
    openBackDrop = "slds-backdrop";
    @api startObjName = 'Contact';
    objectName = 'Account';
    mergeFieldString = '';
    dataList;
    value;


    selectedField = {
        visible: false,
        title: '',
        api: '',
        dataType: '',

        setField(valJSON) {
            let fieldInfo = JSON.parse(valJSON);
            this.title = fieldInfo.label;
            this.api = fieldInfo.value;
            this.dataType = fieldInfo.dataType;
        },

        show() {
            this.visible = true;
        },

        hide() {
            this.visible = false;
        },

        isVisible() {
            return this.visible;
        }
    }

    dynamicCmpCreationStates = [];

    selectedFieldInfos = [];
    cmpCount = 0;
    maxCmpCount = 4;

    connectedCallback() {
        this.objectName = this.startObjName;
    }
    errorCallback(error, stack) {
        console.log(error);
        console.log(stack);
    }

    @api
    get hasMaximumReached() {
        if (this.cmpCount == this.maxCmpCount - 1) {
            return true;
        }
        return false;
    }

    openModal() {
        this.className = "slds-modal slds-fade-in-open";
        this.openBackDrop = "slds-backdrop slds-backdrop_open";

        this.dynamicCmpCreationStates.splice(1, this.dynamicCmpCreationStates.length);

        this.dynamicCmpCreationStates[0].showSelector();
        this.dynamicCmpCreationStates[0].showRightArrow();

        this.dynamicCmpCreationStates = [...this.dynamicCmpCreationStates];
        this.mergeFieldString = '';
        this.selectedField.hide();
    }

    closeModal() {
        this.className = "slds-modal slds-modal_small";
        this.openBackDrop = "slds-backdrop";
    }

    @wire(getObjectInfo, { objectApiName: '$objectName' })
    objectInfo({ error, data }) {
        if (data) {
            // console.log('@wire called: Object Info', data);
            let fieldsInfos = new Object(data.fields);
            let fieldsModelList = [];
            let uniqueKey = { uniqueKeyGen: 1 };
            for (let fieldName in fieldsInfos) {
                this.fillObjectFieldList()
                let fieldInfo = fieldsInfos[fieldName];
                this.fillObjectFieldList(fieldInfo, uniqueKey, fieldsModelList);
            }
            if (this.cmpCount < this.maxCmpCount) {
                this.fillDynamicCompCreationArray(fieldsModelList);
            }
        }
        else if (error) {
            // console.log('Wire objectInfo Error',error);            
            this.dataList = undefined;
        }
    }

    setValue(event) {
        // console.log('setValue', event.detail);
        this.value = JSON.parse(event.detail);
        /*Checking which component clicked by checing its component number in dynamincComps array*/

        if (this.value && this.dynamicCmpCreationStates[this.value.componentNo]) {

            let countOfItemsToRemove = this.dynamicCmpCreationStates.length - this.value.componentNo;

            this.dynamicCmpCreationStates.splice(this.value.componentNo, countOfItemsToRemove);
            let lastElement = this.dynamicCmpCreationStates[this.dynamicCmpCreationStates.length - 1];
            lastElement.hideRightArrow();
            lastElement.setfieldInfo(this.value);


            this.dynamicCmpCreationStates = [...this.dynamicCmpCreationStates];
            this.cmpCount = this.dynamicCmpCreationStates.length;
        }


        let lastElement = this.dynamicCmpCreationStates[this.dynamicCmpCreationStates.length - 1];
        lastElement.showLabel();
        lastElement.hideRightArrow();
        lastElement.setfieldInfo(this.value);

        this.dynamicCmpCreationStates = [...this.dynamicCmpCreationStates];

        if (this.value.referenceName && this.value.referenceName != this.objectName) {

            lastElement.showRightArrow();
            this.dynamicCmpCreationStates = [...this.dynamicCmpCreationStates];

            this.objectName = this.value.referenceName;
        }
        else if (this.value.referenceName && this.value.referenceName == this.objectName && this.cmpCount < this.maxCmpCount) {

            lastElement.showRightArrow();

            this.dynamicCmpCreationStates = [...this.dynamicCmpCreationStates];

            this.cmpCount++;
            console.log('sameobject', this.value.referenceName, this.objectName);

            let countOfComps = this.dynamicCmpCreationStates.length;
            let cloneDynCmp = Object.assign({}, this.dynamicCmpCreationStates[countOfComps - 1]);

            cloneDynCmp.uniqueid++;
            cloneDynCmp.rightArrow = this.cmpCount < this.maxCmpCount ? true : false,
            cloneDynCmp.showSelector();
            cloneDynCmp.setfieldInfo(this.value);


            this.dynamicCmpCreationStates.push(cloneDynCmp);
            this.dynamicCmpCreationStates = [...this.dynamicCmpCreationStates];
            this.cmpCount = this.dynamicCmpCreationStates.length;
        }
        else if (!this.value.referenceName) {
            this.selectedField.setField(event.detail);
            this.selectedField.show();
        }

        console.log(this.dynamicCmpCreationStates);
    }

    fillObjectFieldList(innerObj, uniqueKey, fieldsModelList) {
        for (let innerKey in innerObj) {
            if (innerKey == 'updateable' && innerObj[innerKey] == true) {
                let obj = {};
                obj.label = innerObj['label'];
                obj.value = innerObj['apiName'];
                obj.dataType = innerObj['dataType'];
                obj.isReference = innerObj['dataType'] == 'Reference' ? true : false;
                obj.referenceToInfos = innerObj['referenceToInfos'];
                obj.uniqueid = uniqueKey.uniqueKeyGen;
                obj.relationshipName = innerObj['relationshipName'];
                /**
                 * Checking if Field is reference than checking it is supoorted oject or not.
                 */
                if (innerObj['reference'] == true && this.isObjectSupported(obj, innerObj) && this.cmpCount < this.maxCmpCount - 1) {
                    fieldsModelList.push(obj);
                    uniqueKey.uniqueKeyGen++;
                }
                else if (innerObj['reference'] == false) {
                    fieldsModelList.push(obj);
                    uniqueKey.uniqueKeyGen++;
                }
                else {
                    console.log(innerObj);
                }
            }
        }
    }

    fillDynamicCompCreationArray(fieldsModelList) {
        this.cmpCount++;
        fieldsModelList = fieldsModelList.sort(this.compare);
        let referenceFields = [];
        let fields = [];
        for (let field of fieldsModelList) {
            if (field.isReference) {
                referenceFields.push(field);
            }
            else {
                fields.push(field);
            }
        }
        console.log(referenceFields);
        console.log(fields);

        fieldsModelList = [];
        fieldsModelList = referenceFields.concat(fields);
        fieldsModelList = [...fieldsModelList];

        let cmpCreateState = {
            uniqueid: this.cmpCount,
            dataList: fieldsModelList,
            objectName: this.objectName,
            rightArrow: false,//this.cmpCount < this.maxCmpCount ? true : false,                        
            selector: false,
            label: false,
            selectedFieldInfo: '',
            selectedFieldInfoStr: '',

            setfieldInfo(val) {
                if (typeof val == "object") {
                    this.selectedFieldInfo = val;
                    this.selectedFieldInfoStr = JSON.stringify(val);
                }
                else if (typeof val == "string") {
                    this.selectedFieldInfo = JSON.parse(val);
                    this.selectedFieldInfoStr = val;
                }
                // console.log('this.selectedFieldInfoStr', this.selectedFieldInfoStr);
            },

            showSelector() {
                this.selector = true;
                this.label = false;
            },

            showLabel() {
                this.selector = false;
                this.label = true;
                // console.log('this.selector', this.selector, 'this.label', this.label);
            },

            showRightArrow() {
                this.rightArrow = true;
            },

            hideRightArrow() {
                this.rightArrow = false;
            }

        }

        this.dynamicCmpCreationStates.push(cmpCreateState);
        cmpCreateState.showSelector();
        this.dynamicCmpCreationStates = [...this.dynamicCmpCreationStates];
        console.log(cmpCreateState, this.dynamicCmpCreationStates);
    }

    fillSelectedFieldInfos() {
        this.selectedFieldInfos = [];
        for (let cmpCreateState of this.dynamicCmpCreationStates) {
            this.selectedFieldInfos.push(cmpCreateState.selectedFieldInfo);
        }
        console.log(this.selectedFieldInfos);
    }

    getMergeSyntax() {
        this.fillSelectedFieldInfos();
        if (this.selectedFieldInfos && this.selectedFieldInfos.length > 0) {
            console.log(this.selectedFieldInfos, this.objectName);

            let mergeFieldSyntax = `{!${this.startObjName}.`;

            for (let mergeField of this.selectedFieldInfos) {
                if (mergeField.relationshipName) {
                    mergeFieldSyntax += mergeField.relationshipName + '.';
                }
                else {
                    mergeFieldSyntax += mergeField.value + '.';
                }
            }
            mergeFieldSyntax = mergeFieldSyntax.substring(0, mergeFieldSyntax.length - 1);
            mergeFieldSyntax += '}';
            // console.log(this.selectedFieldInfos);
            this.mergeFieldString = mergeFieldSyntax;
            console.log(this.mergeFieldString);
            const onMergeFieldFormed = new CustomEvent('onMergeFieldFormed',
                {
                    detail: this.mergeFieldString,
                    bubbles: true,
                    composed: true
                });
            this.dispatchEvent(onMergeFieldFormed);
            this.closeModal();
        }
    }

    openSelector(event) {
        let fieldInfoStr = event.currentTarget.dataset.fieldInfo;
        let fieldInfo = JSON.parse(fieldInfoStr);
        //console.log(fieldInfo);

        this.selectedField.hide();


        if (fieldInfo && this.dynamicCmpCreationStates[fieldInfo.componentNo - 1]) {

            let countOfItemsToRemove = this.dynamicCmpCreationStates.length - fieldInfo.componentNo;

            this.dynamicCmpCreationStates.splice(fieldInfo.componentNo, countOfItemsToRemove);
            let lastElement = this.dynamicCmpCreationStates[this.dynamicCmpCreationStates.length - 1];

            lastElement.showRightArrow();
            lastElement.showSelector();
            lastElement.setfieldInfo(fieldInfoStr);

            this.dynamicCmpCreationStates = [...this.dynamicCmpCreationStates];
            this.cmpCount = this.dynamicCmpCreationStates.length;

            console.log('openSelector', this.dynamicCmpCreationStates);
        }
    }

    isObjectSupported(wrapItem, referneceFieldInfo) {
        let supportedObject = {
            isSupported: '',
            referenceObjectName: '',
        }

        referneceFieldInfo.referenceToInfos.forEach((fieldInfo) => {
            if (this.supportedObjects.includes(fieldInfo.apiName)) {
                supportedObject.isSupported = true;
                supportedObject.referenceObjectName = fieldInfo.apiName;
            }
        });
        // console.log(referneceFieldInfo.referenceToInfos, supportedObject);
        if (supportedObject.isSupported) {
            wrapItem.referenceName = supportedObject.referenceObjectName;
            return true;
        }
        return false;
    }


    copyToClipboard() {
        const el = document.createElement('textarea');
        el.value = this.mergeFieldString;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
    };

    supportedObjects = ["Account", "AccountContactRelation", "AccountForecast", "AccountProductForecast",
        "AccountProductPeriodForecast", "AccountPartner", "AccountTeamMember", "ActionCadence", "ActionPlanItem",
        "AssessmentTask", "AssessmentTaskOrder", "Asset", "AssetRelationship", "AssignedResource", "AttachedContentNote",
        "BasicDataRecord", "BusinessAccount", "BusinessMilestone", "BusinessProfile", "Campaign", "CampaignMember",
        "CareBarrier", "CareBarrierType", "CareProgram", "CareProgramEnrollee", "Case", "Claim", "ClaimCase",
        "ClaimItem", "ClaimParticipant", "Contact", "ContactRequest", "ContentDocument",
        "ContentNote", "ContentVersion", "ContentWorkspace", "Contract", "ContractContactRole",
        "ContractLineItem", "CoverageType", "CustomerProperty", "DataExportDefinition",
        "DataStreamDefinition", "DeleteEvent", "DigitalSignature", "ElectronicMediaGroup", "Entitlement",
        "EntityArchivingSetup", "EnvironmentHubMember", "Image", "InsuranceClaimAsset", "InsurancePolicy",
        "InsurancePolicyAsset", "InsurancePolicyCoverage", "InsurancePolicyMemberAsset", "InsurancePolicyParticipant",
        "InsuranceProfile", "JobProfile", "KnowledgeArticleVersion", "Lead", "LicensingRequest", "LoanApplicant",
        "LoanApplicationLiability", "LoyaltyProgramCurrency", "LoyaltyProgramMember", "LoyaltyProgramPartner", "LoyaltyTier",
        "LoyaltyTierGroup", "MaintenanceAsset", "MaintenancePlan", "MarketingAction", "MarketingResource", "Note",
        "OperatingHours", "Opportunity", "OpportunityLineItem", "OpportunityLineItemSchedule", "OpportunityPartner",
        "OpportunityTeamMember", "Order", "OrderItem", "OrderItemSummaryChange", "OrderSummary", "OrgMetric",
        "OrgMetricScanSummary", "OrgMetricScanResult", "Partner", "PersonAccount", "PersonLifeEvent",
        "PriceAdjustmentSchedule", "Pricebook2", "PricebookEntry", "Producer", "ProducerPolicyAssignment",
        "Product2", "Product2DataTranslation", "ProductCategoryDataTranslation", "ProductCoverage", "ProductMedia",
        "Quote", "QuoteDocument", "QuoteLineItem", "RecordType", "ResourceAbsence", "ResourcePreference",
        "RetailVisitKpi", "RetailVisitWorkTask", "RetailVisitWorkTaskOrder", "SalesAgreement", "SalesAgreementProduct",
        "SecuritiesHolding", "ServiceAppointment", "ServiceContract", "ServiceCrew", "ServiceCrewMember",
        "ServiceResource", "ServiceResourceCapacity", "ServiceResourceSkill", "ServiceTerritory",
        "ServiceTerritoryLocation", "ServiceTerritoryMember", "Shift", "Shipment", "SkillRequirement",
        "SocialPost", "SurveyInvitation", "SurveyResponse", "SurveySubject", "Tenant", "TimeSheet",
        "TimeSheetEntry", "TimeSlot", "UsageEntitlement", "UsageEntitlementPeriod", "User", "Visit",
        "WebStoreSearchProdSettings", "WorkerCompCoverageClass", "WorkOrder", "WorkOrderLineItem", "WorkType"];

    compare(a, b) {
        if (a.label < b.label) {
            return -1;
        }
        if (a.label > b.label) {
            return 1;
        }
        return 0;
    }
}