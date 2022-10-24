from aws_cdk import (
    Stack,
    aws_certificatemanager as acm,
    aws_route53 as route53,
    aws_apigateway as apigateway,
    aws_lambda as _lambda,
    aws_route53_targets as targets,
)

from constructs import Construct


class ApiRoute53Stack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # The code that defines your stack goes here

        # Fetch the hosted zone
        hosted_zone = route53.HostedZone.from_lookup(self, "HostedZone", domain_name="example.com")

        # Create a certificate
        certificate = acm.DnsValidatedCertificate(
            self,
            "ApiCertificate",
            domain_name="api.example.com",
            hosted_zone=hosted_zone,
            region="us-east-1",
        )

        # Create a lambda function
        handler = _lambda.Function(
            self,
            "ApiHandler",
            runtime=_lambda.Runtime.PYTHON_3_8,
            handler="lambda_function.lambda_handler",
            code=_lambda.Code.from_asset("api_route53"),
        )
            
        # Create an API Gateway
        api = apigateway.LambdaRestApi(
            self,
            "ApiGateway",
            handler=handler,
            domain_name=apigateway.DomainNameOptions(
                domain_name="api.example.com",
                certificate=certificate,
                security_policy=apigateway.SecurityPolicy.TLS_1_2,
                endpoint_type=apigateway.EndpointType.EDGE,
            )
        )

        # Create a Route53 record
        route53.ARecord(
            self,
            "ApiRecord",
            record_name="api",
            zone=hosted_zone,
            target=route53.RecordTarget.from_alias(targets.ApiGateway(api)),
        )