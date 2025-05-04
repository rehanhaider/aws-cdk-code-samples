import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { join } from 'path';
import { aws_apigateway as apigw } from 'aws-cdk-lib';
import { aws_lambda as lambda } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
import { aws_logs as logs } from 'aws-cdk-lib';
import { aws_cognito as cognito } from 'aws-cdk-lib';
import { aws_dynamodb as dynamodb } from 'aws-cdk-lib';
import { aws_cloudfront as cloudfront } from 'aws-cdk-lib';
import { aws_cloudfront_origins as origins } from 'aws-cdk-lib';
import { aws_certificatemanager as acm } from 'aws-cdk-lib';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { aws_route53 as route53 } from 'aws-cdk-lib';
import { aws_route53_targets as targets } from 'aws-cdk-lib';


export class Api extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Create a bucket to store the website
        const bucket = new s3.Bucket(this, 'MyDemoBucket');

        // Create a certificate

        const hostedZone = HostedZone.fromHostedZoneId(this, 'HostedZone', 'Z21DNDUVLTQW6Q');

        const certificate = new acm.Certificate(this, 'Certificate', {
            certificateName: 'MyDemoCertificate',
            domainName: 'intellipaat.com',
            subjectAlternativeNames: ['*.intellipaat.com'],
            validation: acm.CertificateValidation.fromDnsMultiZone(
                {
                    'intellipaat.com': hostedZone,
                    '*.intellipaat.com': hostedZone,
                }
            ),
        });
        
        // Create a CloudFront Distribution
        const cdnOAI = new cloudfront.OriginAccessIdentity(this, 'CdnOAI',
            {
                comment: 'OAI for CloudFront Distribution',
            }
        );

        bucket.grantRead(cdnOAI);
        cdnOAI.applyRemovalPolicy(RemovalPolicy.DESTROY);


        const cfFunction = new cloudfront.Function(this, 'CfnFunction', {
            code: cloudfront.FunctionCode.fromFile({
                filePath: join(__dirname, 'fn/cdn/index.js'),
            }),
        });

        
        const distribution = new cloudfront.Distribution(this, 'CdnDistribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(bucket, {
                    originAccessIdentity: cdnOAI,
                }),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
            priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
            certificate: certificate,
            domainNames: ['intellipaat.com', 'www.intellipaat.com'],
        });
        
        // Point the domain name to the CloudFront Distribution
        new route53.ARecord(this, 'CdnRecord', {
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            recordName: 'intellipaat.com',
        });

        new route53.ARecord(this, 'CdnRecord', {
            zone: hostedZone,
            target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
            recordName: 'www.intellipaat.com',
        });


        // Create a DynamoDB Table
        const table = new dynamodb.Table(this, 'MyDemoTable', {
            partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
        });


        // Create layers
        const ARN_POWERTOOLS_LAYER = "arn:aws:lambda:us-east-1:017000801446:layer:AWSLambdaPowertoolsPythonV3-python312-x86_64:11";
        const powerToolsLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'PowerToolsLayer', ARN_POWERTOOLS_LAYER);
        const myLayer = new lambda.LayerVersion(this, 'MyLayer', {
            code: lambda.Code.fromAsset(join(__dirname, '../layer')),
            compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
        });

        // Create a lambda function
        const fn = new lambda.Function(this, 'Handler', {
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: "app.main",
            code: lambda.Code.fromAsset(join(__dirname, 'fn/api')),
            layers: [
                powerToolsLayer,
                myLayer,
            ],
            environment: {
                BUCKET_NAME: bucket.bucketName,
                TABLE_NAME: table.tableName,
            },
        });

        // Grant the lambda function permission to access the bucket
        bucket.grantReadWrite(fn);
        table.grantReadWriteData(fn);

        // Create Log Group
        const logGroup = new logs.LogGroup(this, 'LogGroup', {
            logGroupName: `/aws/lambda/${fn.functionName}`,
            retention: logs.RetentionDays.ONE_DAY,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        // Create a Cognito User Pool
        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'MyUserPool',
            signInAliases: { email: true },
            standardAttributes: {
                email: { required: true, mutable: false },
                familyName: { required: true, mutable: true },
                givenName: { required: true, mutable: true },
            },
            mfa: cognito.Mfa.OFF,
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            selfSignUpEnabled: true,
            autoVerify: { email: true },
            email: cognito.UserPoolEmail.withCognito(),
        });

        // Create a Cognito User Pool Client
        const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool: userPool,
            userPoolClientName: 'MyUserPoolClient',
            authFlows: {
                adminUserPassword: true,
                userPassword: true,
                userSrp: true
            },
            generateSecret: false,
            oAuth: {
                callbackUrls: ['http://localhost:3000'], // TODO: Change to the frontend URL
            }
        });

        // Create a API GW Authorizer
        const authorizer = new apigw.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
            authorizerName: 'MyAuthorizer',
            cognitoUserPools: [userPool],
        });
        
        
        // Create an API Gateway
        const api = new apigw.LambdaRestApi(this, 'Api', {
            handler: fn,
            proxy: true,
            deployOptions: {
                stageName: 'v1',
            },
            endpointTypes: [apigw.EndpointType.REGIONAL],
            defaultMethodOptions: {
                authorizationType: apigw.AuthorizationType.COGNITO,
                authorizer: authorizer,
            },
            defaultCorsPreflightOptions: {
                allowOrigins: ["*"],
                allowMethods: apigw.Cors.ALL_METHODS,
                allowHeaders: ["*", "Authorization"],
            }
        });

    }
}
