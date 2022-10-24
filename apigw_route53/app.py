#!/usr/bin/env python3
import os

import aws_cdk as cdk

from api_route53.api_route53_stack import ApiRoute53Stack

app = cdk.App()
env = cdk.Environment(account="<AWS_ACCOUNT_ID>", region="us-east-1")

ApiRoute53Stack(app, "ApiRoute53Stack", env=env)

app.synth()
